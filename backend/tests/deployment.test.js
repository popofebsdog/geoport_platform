import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, chmodSync, statSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import yaml from 'js-yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let temp;
let bin;
let database;
let log;

function executable(name, contents) {
  const path = join(bin, name);
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}

function run(script, args = [], env = {}, input = 'n\n') {
  return spawnSync('bash', [script, ...args], {
    encoding: 'utf8', input, timeout: 10000,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_LOG: log,
      DB_NAME: 'isolated_test', DB_HOST: 'invalid.test', DB_PASSWORD: 'test-only',
      ...env },
  });
}

function calls() {
  return existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
}

beforeEach(() => {
  temp = mkdtempSync(join(tmpdir(), 'geoport-deployment-'));
  bin = join(temp, 'bin');
  database = join(temp, 'database');
  log = join(temp, 'calls.jsonl');
  mkdirSync(bin);
  mkdirSync(join(database, 'migrations'), { recursive: true });
  for (const name of ['deploy.sh', 'manage.sh']) copyFileSync(join(root, 'backend/database', name), join(database, name));
  writeFileSync(join(database, 'init.sql'), 'SELECT 1; -- INITIALIZE\n');
  writeFileSync(join(database, 'migrations/000_create_schema_migrations.sql'), 'CREATE TABLE schema_migrations (version text, checksum text);\n');
  writeFileSync(join(database, 'migrations/001_test.sql'), 'CREATE TABLE test_atomic (id integer); -- MIGRATION_BODY\n');
  executable('psql', `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
let sql = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-f') sql += fs.readFileSync(args[++i] === '-' ? 0 : args[i], 'utf8') + '\\n';
  else if (args[i] === '-c' || args[i] === '-tAc') sql += args[++i] + '\\n';
}
if (!args.includes('-f') && !args.includes('-c') && !args.includes('-tAc') && !args.includes('-lqt')) sql = fs.readFileSync(0, 'utf8');
fs.appendFileSync(process.env.TEST_LOG, JSON.stringify({args, sql}) + '\\n');
const stop = args.includes('ON_ERROR_STOP=1') || args.includes('--set=ON_ERROR_STOP=1');
const mode = process.env.FAIL_MODE;
const fail = (mode === 'init' && sql.includes('INITIALIZE')) ||
  (mode === 'migration' && sql.includes('MIGRATION_BODY')) ||
  (mode === 'record' && sql.includes('INSERT INTO schema_migrations')) ||
  (mode === 'lookup' && sql.includes('SELECT 1 FROM schema_migrations')) ||
  (mode === 'restore' && sql.includes('RESTORE_ERROR'));
if (mode === 'list' && args.includes('-lqt')) process.exit(2);
if (fail) { process.stderr.write('ERROR: simulated SQL failure\\n'); process.exit(stop ? 3 : 0); }
if (sql.includes('SELECT 1 FROM schema_migrations') && process.env.ALREADY_APPLIED === '1') process.stdout.write('1\\n');
`);
});

afterEach(() => rmSync(temp, { recursive: true, force: true }));

test('dev uses the same PostGIS image as production', () => {
  const compose = yaml.load(readFileSync(join(root, 'docker-compose.yml'), 'utf8'));
  const image = name => compose.services[name].image;
  expect(image('postgres')).toContain('postgis/postgis:');
  expect(image('postgres-dev')).toBe(image('postgres'));
});

test('init comments the connected database, not a fixed database name', () => {
  const sql = readFileSync(join(root, 'backend/database/init.sql'), 'utf8');
  expect(sql).not.toMatch(/^COMMENT ON DATABASE geoport_db\b/m);
  expect(sql).toContain('current_database()');
});

test.each(['init', 'migration', 'lookup', 'list'])('deploy stops immediately on %s failure', mode => {
  const result = run(join(database, 'deploy.sh'), [], { FAIL_MODE: mode });
  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(result.stdout).not.toContain('資料庫部署完成');
  if (mode === 'migration') {
    const attempted = calls();
    const failureIndex = attempted.findIndex(call => call.sql.includes('MIGRATION_BODY'));
    expect(failureIndex).toBeGreaterThanOrEqual(0);
    expect(attempted.slice(failureIndex + 1).some(call => call.sql.includes('INSERT INTO schema_migrations'))).toBe(false);
  }
});

test('migration and version insertion share a fail-fast single transaction', () => {
  const result = run(join(database, 'deploy.sh'));
  expect(result.status).toBe(0);
  const call = calls().find(call => call.sql.includes('MIGRATION_BODY'));
  expect(call.sql).toContain('INSERT INTO schema_migrations');
  expect(call.args).toContain('--single-transaction');
  expect(call.args).toContain('ON_ERROR_STOP=1');
  expect(calls().every(call => call.args.includes('-X'))).toBe(true);
});

test('successful deployment never prints the database password', () => {
  const password = 'synthetic-deployment-password-9!';
  const result = run(join(database, 'deploy.sh'), [], { DB_PASSWORD: password });
  expect(result.status).toBe(0);
  expect(result.stdout + result.stderr).not.toContain(password);
});

test('version insertion failure aborts the same migration transaction', () => {
  const result = run(join(database, 'deploy.sh'), [], { FAIL_MODE: 'record' });
  expect(result.status).not.toBe(0);
  const call = calls().find(call => call.sql.includes('INSERT INTO schema_migrations'));
  expect(call.sql).toContain('CREATE TABLE schema_migrations');
  expect(call.args).toContain('--single-transaction');
});

test('017 outer transaction is removed at runtime without changing its source', () => {
  const path = join(database, 'migrations/017_migrate_existing_projects_to_parent_child.sql');
  const source = 'BEGIN;\nDO $$\nBEGIN\n  PERFORM 1;\nEND $$;\nCOMMIT;\nSELECT 1; -- WRAPPED_MIGRATION\n';
  writeFileSync(path, source);
  const result = run(join(database, 'deploy.sh'));
  expect(result.status).toBe(0);
  const call = calls().find(call => call.sql.includes('WRAPPED_MIGRATION'));
  expect(call.sql).not.toMatch(/^(BEGIN|COMMIT);$/m);
  expect(call.sql).toContain('DO $$\nBEGIN\n');
  expect(call.sql).toContain('INSERT INTO schema_migrations');
  expect(call.args).toContain('--single-transaction');
  expect(readFileSync(path, 'utf8')).toBe(source);
});

test('applied migrations are skipped', () => {
  expect(run(join(database, 'deploy.sh'), [], { ALREADY_APPLIED: '1' }).status).toBe(0);
  expect(calls().some(call => call.sql.includes('MIGRATION_BODY'))).toBe(false);
});

test('fresh deployments bootstrap migration tracking before earlier-sorting functions', () => {
  writeFileSync(join(database, 'migrations/000_create_functions.sql'), 'SELECT 1; -- EARLY_FUNCTIONS\n');
  expect(run(join(database, 'deploy.sh')).status).toBe(0);
  const attempted = calls();
  const tracker = attempted.findIndex(call => call.sql.includes('CREATE TABLE schema_migrations'));
  const lookup = attempted.findIndex(call => call.sql.includes('SELECT 1 FROM schema_migrations'));
  expect(tracker).toBeLessThan(lookup);
});

test.each(['sql', 'gzip', 'success'])('restore handles %s result without false success', mode => {
  mkdirSync(join(database, 'backups'));
  writeFileSync(join(database, 'backups/test.sql.gz'), 'stub compressed file');
  executable('gunzip', `#!/bin/bash\nprintf 'SELECT 1; -- RESTORE_ERROR\\n'\nexit ${mode === 'gzip' ? 1 : 0}\n`);
  const result = run(join(database, 'manage.sh'), ['restore'], { FAIL_MODE: mode === 'sql' ? 'restore' : '', BACKUP_ROOT: join(database, 'backups') }, '1\ny\n');
  expect(result.error).toBeUndefined();
  if (mode === 'success') {
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('還原完成');
  } else {
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('還原完成');
  }
});

function storageFixture() {
  const script = join(root, 'scripts/prepare-storage.sh');
  expect(existsSync(script)).toBe(true);
  const project = join(temp, 'project');
  mkdirSync(join(project, 'backend'), { recursive: true });
  executable('id', '#!/bin/bash\nprintf "0\\n"\n');
  executable('chown', `#!${process.execPath}\nrequire('node:fs').appendFileSync(process.env.TEST_LOG, JSON.stringify({chown:process.argv.slice(2)}) + '\\n');\n`);
  return { script, project };
}

test('storage preparation creates only missing directories for container UID/GID 1000', () => {
  const { script, project } = storageFixture();
  expect(statSync(script).mode & 0o111).not.toBe(0);
  expect(run(script, [project]).status).toBe(0);
  for (const path of [join(project, 'backend/uploads'), join(project, 'data')]) {
    expect(statSync(path).mode & 0o777).toBe(0o755);
    expect(calls()).toContainEqual({ chown: ['1000:1000', path] });
  }
});

test('storage preparation never changes existing directories or contents', () => {
  const { script, project } = storageFixture();
  const paths = [join(project, 'backend/uploads'), join(project, 'data')];
  for (const path of paths) {
    mkdirSync(path, { mode: 0o750 });
    writeFileSync(join(path, 'keep'), 'existing data', { mode: 0o640 });
  }
  const before = paths.map(path => [statSync(path), statSync(join(path, 'keep'))]);
  expect(run(script, [project]).status).toBe(0);
  expect(calls()).toEqual([]);
  paths.forEach((path, index) => {
    expect(statSync(path).mode).toBe(before[index][0].mode);
    expect(statSync(path).uid).toBe(before[index][0].uid);
    expect(statSync(join(path, 'keep')).mode).toBe(before[index][1].mode);
    expect(readFileSync(join(path, 'keep'), 'utf8')).toBe('existing data');
  });
});

test('storage preparation rejects symlinks without changing their targets', () => {
  const { script, project } = storageFixture();
  const external = join(temp, 'external');
  mkdirSync(external, { mode: 0o700 });
  symlinkSync(external, join(project, 'backend/uploads'));
  expect(run(script, [project]).status).not.toBe(0);
  expect(statSync(external).mode & 0o777).toBe(0o700);
  expect(calls()).toEqual([]);
});

test('guide uses storage preparation without recursive permission changes', () => {
  const guide = readFileSync(join(root, 'docs/aws-deployment-guide.md'), 'utf8').split('## 五、')[1].split('## 六、')[0];
  expect(guide).toContain('sudo ./scripts/prepare-storage.sh');
  expect(guide).not.toMatch(/chmod\s+-R|chmod\s+777/);
  expect(guide).toContain('1000');
});
