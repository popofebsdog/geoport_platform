import { test, expect, afterEach } from '@jest/globals';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const temporary = [];
let server;
afterEach(async () => {
  if (server) { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); server = null; }
  for (const directory of temporary.splice(0)) await rm(directory, { recursive: true, force: true });
});
const run = (file, args = [], env = {}) => new Promise(resolve => {
  const child = spawn(process.execPath, [path.join(root, file), ...args], { env: { ...process.env, ...env } });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('close', code => resolve({ code, stdout, stderr }));
});

test('the operations probe fails on degraded health and delivers only a redacted alert summary', async () => {
  let notified;
  server = createServer((req, res) => {
    if (req.url === '/notify') {
      let body = ''; req.on('data', chunk => { body += chunk; });
      req.on('end', () => { notified = JSON.parse(body); res.end('ok'); });
    } else res.end(JSON.stringify({ status: 'warning', components: { database: { status: 'error', message: 'private database detail' } } }));
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const result = await run('backend/scripts/check-health.js', [], { HEALTHCHECK_URL: `${origin}/health?token=secret`, ALERT_WEBHOOK_URL: `${origin}/notify` });
  expect(result.code).toBe(1);
  expect(notified.text).toContain('database:error');
  expect(result.stdout + result.stderr + JSON.stringify(notified)).not.toMatch(/private database detail|token=secret/);
});

test('healthy operations probes exit successfully', async () => {
  server = createServer((_req, res) => res.end(JSON.stringify({ status: 'ok', components: { database: { status: 'ok' } } }))).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const result = await run('backend/scripts/check-health.js', [], { HEALTHCHECK_URL: `http://127.0.0.1:${server.address().port}/health`, ALERT_WEBHOOK_URL: '' });
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).status).toBe('ok');
});

test.each(['valid', 'missing', 'corrupt', 'stale'])('backup freshness rejects unusable bundles: %s', async mode => {
  server = createServer((_req, res) => res.end(JSON.stringify({ status: 'ok', components: { database: { status: 'ok' } } }))).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const directory = await mkdtemp(path.join(tmpdir(), 'geoport-probe-backup-')); temporary.push(directory);
  const bundle = path.join(directory, 'geoport_bundle_fixture'); await mkdir(bundle);
  for (const name of ['database.sql.gz', 'uploads.tar.gz', 'data.tar.gz']) await writeFile(path.join(bundle, name), 'fixture');
  expect((await run('backend/scripts/verify-backup.js', ['--create', bundle])).code).toBe(0);
  if (mode === 'missing') await rm(path.join(bundle, 'uploads.tar.gz'));
  if (mode === 'corrupt') await writeFile(path.join(bundle, 'uploads.tar.gz'), 'changed');
  if (mode === 'stale') {
    const manifest = JSON.parse(await readFile(path.join(bundle, 'manifest.json'), 'utf8'));
    manifest.createdAt = '2020-01-01T00:00:00Z';
    await writeFile(path.join(bundle, 'manifest.json'), JSON.stringify(manifest));
  }
  const result = await run('backend/scripts/check-health.js', [], { HEALTHCHECK_URL: `http://127.0.0.1:${server.address().port}/health`, ALERT_WEBHOOK_URL: '', BACKUP_ROOT: directory, BACKUP_MAX_AGE_HOURS: '26' });
  expect(result.code).toBe(mode === 'valid' ? 0 : 1);
});

test('release packages include untracked source, omit secrets and data, and cannot overwrite a release', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'geoport-release-test-')); temporary.push(directory);
  await mkdir(path.join(directory, 'backend/src'), { recursive: true });
  await mkdir(path.join(directory, 'backend/uploads'), { recursive: true });
  await writeFile(path.join(directory, 'package.json'), '{}');
  await writeFile(path.join(directory, 'backend/src/current.js'), 'export const current = true;');
  await writeFile(path.join(directory, '.env'), 'PASSWORD=never-package');
  await writeFile(path.join(directory, 'backend/uploads/private.txt'), 'private data');
  await mkdir(path.join(directory, 'frontend/src/components/uploads'), { recursive: true });
  await writeFile(path.join(directory, 'frontend/src/components/uploads/LayerUploadModal.vue'), '<template><div>Upload</div></template>');
  await mkdir(path.join(directory, 'frontend/public/data/uploads'), { recursive: true });
  await writeFile(path.join(directory, 'frontend/public/data/uploads/private.csv'), 'private upload');
  await mkdir(path.join(directory, 'frontend/public'), { recursive: true });
  await mkdir(path.join(directory, 'frontend/dist/assets'), { recursive: true });
  await writeFile(path.join(directory, 'frontend/public/DamanProfiles.geojson'), '{"type":"FeatureCollection","features":[]}');
  await writeFile(path.join(directory, 'frontend/public/data.csv'), 'time,value\n0,1');
  await writeFile(path.join(directory, 'frontend/dist/assets/app.js'), 'export const built = true;');
  execFileSync('git', ['init', '-q'], { cwd: directory });
  const { createRelease } = await import('../../scripts/package-release.mjs');
  const archive = path.join(directory, 'release.tar.gz');
  const result = await createRelease(directory, archive);
  expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  const contents = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' });
  expect(contents).toContain('backend/src/current.js');
  expect(contents).toContain('frontend/src/components/uploads/LayerUploadModal.vue');
  expect(contents).toContain('frontend/public/DamanProfiles.geojson');
  expect(contents).toContain('frontend/public/data.csv');
  expect(contents).toContain('frontend/dist/assets/app.js');
  expect(contents).not.toMatch(/\.env|private\.(?:txt|csv)/);
  const manifest = JSON.parse(execFileSync('tar', ['-xOzf', archive, './release-manifest.json'], { encoding: 'utf8' }));
  expect(manifest.files.find(file => file.path === 'backend/src/current.js').sha256).toMatch(/^[a-f0-9]{64}$/);
  await expect(createRelease(directory, archive)).rejects.toThrow();
});
