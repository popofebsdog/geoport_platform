import { test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, mkdir, writeFile, readdir, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/backup-bundle.sh', import.meta.url));
let root, env;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'geoport-bundle-test-'));
  for (const name of ['bin','uploads','data','backups']) await mkdir(path.join(root,name));
  await writeFile(path.join(root,'uploads/photo.txt'), 'fixture upload');
  await writeFile(path.join(root,'data/map.txt'), 'fixture map');
  await writeFile(path.join(root,'bin/psql'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  await writeFile(path.join(root,'bin/pg_dump'), `#!${process.execPath}\nconst fs=require('node:fs'); if(process.env.FAIL_DUMP)process.exit(9); const arg=process.argv.find(a=>a.startsWith('--file='));fs.writeFileSync(arg.slice(7),'SELECT 1;');\n`, { mode: 0o755 });
  env = { ...process.env, NODE_ENV:'test', BACKUP_WRITES_QUIESCED:'true', PATH:`${root}/bin:${process.env.PATH}`,
    UPLOADS_ROOT:path.join(root,'uploads'), DATA_ROOT:path.join(root,'data'), BACKUP_ROOT:path.join(root,'backups'), DB_PASSWORD:'test-only' };
});
afterEach(async () => { await rm(root,{recursive:true,force:true}); });
const run = extra => spawnSync('bash',[script],{env:{...env,...extra},encoding:'utf8',timeout:10000});

test('full backups require explicit write quiescence', () => {
  expect(run({BACKUP_WRITES_QUIESCED:''}).status).not.toBe(0);
});

test('a complete bundle contains verified database and both file roots', async () => {
  const result = run({});
  expect(result.status).toBe(0);
  const names = await readdir(env.BACKUP_ROOT);
  expect(names).toHaveLength(1);
  const bundle=path.join(env.BACKUP_ROOT,names[0]);
  const { verifyBackup } = await import('../scripts/verify-backup.js');
  expect((await verifyBackup(bundle)).verified).toBe(true);
  expect(await readFile(path.join(root,'uploads/photo.txt'),'utf8')).toBe('fixture upload');
  await writeFile(path.join(bundle,'database.sql.gz'),'corrupt');
  await expect(verifyBackup(bundle)).rejects.toThrow();
});

test('a failed dump publishes no partial bundle and preserves previous backups', async () => {
  await writeFile(path.join(env.BACKUP_ROOT,'existing.txt'),'keep');
  expect(run({FAIL_DUMP:'true'}).status).not.toBe(0);
  expect(await readdir(env.BACKUP_ROOT)).toEqual(['existing.txt']);
});
