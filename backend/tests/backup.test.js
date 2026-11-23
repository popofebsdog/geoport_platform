import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let temp;
let project;
let database;
let bin;
let backupRoot;

function executable(name, source) {
  const path = join(bin, name);
  writeFileSync(path, `#!${process.execPath}\n${source}`);
  chmodSync(path, 0o755);
}

function run(command, env = {}, input = '') {
  return spawnSync('bash', [join(database, 'manage.sh'), command], {
    cwd: temp, encoding: 'utf8', input, timeout: 10000,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, NODE_ENV: 'test',
      BACKUP_ROOT: backupRoot, DB_HOST: 'invalid.test', DB_NAME: 'isolated_test',
      DB_PASSWORD: 'test-only', FAIL_MODE: '', TEST_TEMP: temp, ...env },
  });
}

function files(path = backupRoot) {
  return existsSync(path) ? readdirSync(path) : [];
}

beforeEach(() => {
  temp = mkdtempSync(join(tmpdir(), 'geoport-backup-'));
  project = join(temp, 'project');
  database = join(project, 'backend/database');
  bin = join(temp, 'bin');
  backupRoot = join(temp, 'persistent backups');
  mkdirSync(database, { recursive: true });
  mkdirSync(bin);
  copyFileSync(join(root, 'backend/database/manage.sh'), join(database, 'manage.sh'));
  executable('psql', `
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args.includes('-c')) process.exit(process.env.FAIL_MODE === 'connection' ? 1 : 0);
fs.writeFileSync(process.env.TEST_TEMP + '/restore-args.json', JSON.stringify(args));
const fileIndex = args.indexOf('-f');
fs.writeFileSync(process.env.TEST_TEMP + '/restored.sql', fs.readFileSync(fileIndex >= 0 ? args[fileIndex + 1] : 0));
process.exit(process.env.FAIL_MODE === 'sql' && args.includes('ON_ERROR_STOP=1') ? 3 : 0);
`);
  executable('pg_dump', `
const fs = require('node:fs');
const args = process.argv.slice(2);
const file = args.find(arg => arg.startsWith('--file='));
const sql = 'SELECT 42;\\n';
if (file) fs.writeFileSync(file.slice(7), sql); else process.stdout.write(sql);
process.exit(process.env.FAIL_MODE === 'dump' ? 2 : 0);
`);
  executable('gzip', `
const fs = require('node:fs');
const zlib = require('node:zlib');
const args = process.argv.slice(2);
const file = args.find(arg => !arg.startsWith('-'));
const data = zlib.gzipSync(fs.readFileSync(file || 0));
if (args.includes('-c') || !file) process.stdout.write(data);
else { fs.writeFileSync(file + '.gz', data); fs.unlinkSync(file); }
process.exit(process.env.FAIL_MODE === 'gzip' ? 4 : 0);
`);
  executable('gunzip', `
const fs = require('node:fs');
const zlib = require('node:zlib');
process.stdout.write(zlib.gunzipSync(fs.readFileSync(process.argv[3])));
process.exit(process.env.FAIL_MODE === 'gunzip' ? 5 : 0);
`);
});

afterEach(() => rmSync(temp, { recursive: true, force: true }));

test('backup publishes one compressed dump in BACKUP_ROOT, even with spaces', () => {
  const result = run('backup');
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(files()).toHaveLength(1);
  expect(files()[0]).toMatch(/^geoport_backup_.*\.sql\.gz$/);
  expect(gunzipSync(readFileSync(join(backupRoot, files()[0]))).toString()).toBe('SELECT 42;\n');
  expect(statSync(backupRoot).mode & 0o777).toBe(0o700);
  expect(statSync(join(backupRoot, files()[0])).mode & 0o777).toBe(0o600);
  expect(files(join(database, 'backups'))).toEqual([]);
});

test('local default is repository-root/backups, independent of working directory', () => {
  const result = run('backup', { BACKUP_ROOT: '' });
  expect(result.status).toBe(0);
  expect(files(join(project, 'backups'))).toHaveLength(1);
  expect(files(join(database, 'backups'))).toEqual([]);
});

test('production defaults to /app/backups without accessing a real container directory', () => {
  executable('mkdir', `
require('node:fs').writeFileSync(process.env.TEST_TEMP + '/mkdir-args.json', JSON.stringify(process.argv.slice(2)));
process.exit(17);
`);
  expect(run('backup', { NODE_ENV: 'production', BACKUP_ROOT: '' }).status).not.toBe(0);
  expect(JSON.parse(readFileSync(join(temp, 'mkdir-args.json')))).toContain('/app/backups');
});

test.each(['dump', 'gzip', 'connection'])('%s failure publishes nothing and preserves existing backups', mode => {
  mkdirSync(backupRoot);
  writeFileSync(join(backupRoot, 'existing.sql.gz'), 'do not change');
  const result = run('backup', { FAIL_MODE: mode });
  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(result.stdout).not.toMatch(/備份完成|備份已壓縮/);
  expect(files()).toEqual(['existing.sql.gz']);
  expect(readFileSync(join(backupRoot, 'existing.sql.gz'), 'utf8')).toBe('do not change');
  expect(files(join(database, 'backups'))).toEqual([]);
});

test('same-second backups do not overwrite each other', () => {
  executable('date', "process.stdout.write('20260101_000000\\n');\n");
  expect(run('backup').status).toBe(0);
  expect(run('backup').status).toBe(0);
  expect(files()).toHaveLength(2);
});

test('an unwritable backup destination fails without success output', () => {
  writeFileSync(backupRoot, 'not a directory');
  const result = run('backup');
  expect(result.status).not.toBe(0);
  expect(result.stdout).not.toMatch(/備份完成|備份已壓縮/);
  expect(readFileSync(backupRoot, 'utf8')).toBe('not a directory');
});

test('publication failure cleans staged data without changing existing archives', () => {
  mkdirSync(backupRoot);
  writeFileSync(join(backupRoot, 'existing.sql.gz'), 'keep');
  executable('ln', 'process.exit(1);\n');
  const result = run('backup');
  expect(result.status).not.toBe(0);
  expect(result.stdout).not.toMatch(/備份完成|備份已壓縮/);
  expect(files()).toEqual(['existing.sql.gz']);
  expect(readFileSync(join(backupRoot, 'existing.sql.gz'), 'utf8')).toBe('keep');
});

test.each(['success', 'sql', 'gunzip'])('restore from BACKUP_ROOT handles %s with error-stop and pipefail', mode => {
  mkdirSync(backupRoot);
  const archive = gzipSync('SELECT 42;\n');
  writeFileSync(join(backupRoot, 'test.sql.gz'), archive);
  writeFileSync(join(backupRoot, '.incomplete.sql'), 'partial');
  const result = run('restore', { FAIL_MODE: mode }, '1\ny\n');
  expect(result.error).toBeUndefined();
  expect(result.status === 0).toBe(mode === 'success');
  expect(result.stdout.includes('還原完成')).toBe(mode === 'success');
  if (mode === 'gunzip') {
    expect(existsSync(join(temp, 'restored.sql'))).toBe(false);
    return;
  }
  expect(readFileSync(join(temp, 'restored.sql'), 'utf8')).toBe('SELECT 42;\n');
  expect(JSON.parse(readFileSync(join(temp, 'restore-args.json')))).toEqual(
    expect.arrayContaining(['-X', '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f']),
  );
  expect(readFileSync(join(backupRoot, 'test.sql.gz'))).toEqual(archive);
});

test.each(['0', '2', '1p', '-1', '9999999999999999999999999999999999999999'])('restore rejects invalid selection %s', choice => {
  mkdirSync(backupRoot);
  writeFileSync(join(backupRoot, 'test.sql.gz'), gzipSync('SELECT 42;\n'));
  const result = run('restore', {}, `${choice}\ny\n`);
  expect(result.status).not.toBe(0);
  expect(existsSync(join(temp, 'restored.sql'))).toBe(false);
});

test('restore ignores partial files and directories', () => {
  mkdirSync(backupRoot);
  mkdirSync(join(backupRoot, 'partial.sql.gz'));
  writeFileSync(join(backupRoot, '.backup.partial'), 'incomplete');
  const result = run('restore', {}, '1\ny\n');
  expect(result.status).not.toBe(0);
  expect(result.stdout).toContain('找不到備份檔案');
  expect(existsSync(join(temp, 'restored.sql'))).toBe(false);
});

test('backup locations and generated dumps are excluded from Git', () => {
  const paths = ['backups/test.sql.gz', 'backend/backups/test.sql.gz',
    'backend/database/backups/test.sql.gz', 'custom/geoport_backup_20260101.sql.gz',
    'backend/custom/.geoport_backup_20260101.ABC123/backup.sql', 'backend/.venv/bin/python'];
  for (const path of paths) {
    const result = spawnSync('git', ['check-ignore', '--no-index', path], { cwd: root, encoding: 'utf8' });
    expect(result.stdout.trim()).toBe(path);
  }
});

test('Docker build context excludes backup directories and generated dumps', () => {
  const patterns = readFileSync(join(root, 'backend/.dockerignore'), 'utf8').split(/\r?\n/);
  expect(patterns).toContain('**/backups');
  expect(patterns).toContain('**/geoport_backup_*');
  expect(patterns).toContain('**/.geoport_backup_*');
  expect(patterns).toContain('.venv/');
});
