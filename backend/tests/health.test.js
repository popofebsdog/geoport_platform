import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

const query = jest.fn();
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: { query } }));
jest.unstable_mockModule('dotenv', () => ({ default: { config: jest.fn() } }));
let originalEnv;
let directory;
let missingTables;

beforeEach(async () => {
  jest.resetModules();
  originalEnv = process.env;
  directory = await fs.mkdtemp(path.join(tmpdir(), 'geoport-health-'));
  process.env = { ...process.env, STORAGE_PROVIDER: 'local',
    UPLOADS_ROOT: path.join(directory, 'uploads'), DATA_ROOT: path.join(directory, 'data') };
  await fs.mkdir(process.env.UPLOADS_ROOT);
  await fs.mkdir(process.env.DATA_ROOT);
  missingTables = [];
  query.mockImplementation(async (sql, params) => {
    if (params) return { rows: params[0].filter(name => !missingTables.includes(name)).map(table_name => ({ table_name })) };
    return { rows: [{ exists: false }] };
  });
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ versions: { titiler: '0.24.2' } }) });
});

afterEach(async () => {
  process.env = originalEnv;
  jest.restoreAllMocks();
  await fs.rm(directory, { recursive: true, force: true });
});

async function health() {
  return (await import('../src/services/healthService.js')).getDeepHealth();
}

test('accessible empty roots are healthy; untracked migrations remain only a warning', async () => {
  const result = await health();
  expect(result.status).toBe('warning');
  expect(result.components.storage.status).toBe('ok');
  expect(result.components.database.status).toBe('ok');
});

test.each(['UPLOADS_ROOT', 'DATA_ROOT'])('missing %s makes readiness error', async key => {
  await fs.rmdir(process.env[key]);
  const result = await health();
  expect(result.status).toBe('error');
  expect(result.components.storage.status).toBe('error');
});

test('a non-writable necessary root makes readiness error', async () => {
  const access = fs.access.bind(fs);
  jest.spyOn(fs, 'access').mockImplementation((target, mode) => {
    if (target === process.env.DATA_ROOT) return Promise.reject(Object.assign(new Error('not writable'), { code: 'EACCES' }));
    return access(target, mode);
  });
  const result = await health();
  expect(result.status).toBe('error');
  expect(result.components.storage.status).toBe('error');
});

test('missing core tables makes readiness error', async () => {
  missingTables = ['data_files'];
  const result = await health();
  expect(result.status).toBe('error');
  expect(result.components.database).toMatchObject({ status: 'error', coreTables: { missing: ['data_files'] } });
});

test('a successful response from the wrong service is not healthy TiTiler', async () => {
  globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'OK' }) });
  const result = await health();
  expect(result.status).toBe('error');
  expect(result.components.titiler.status).toBe('error');
});

test.each(['s3', 'gcs', 'unknown'])('unimplemented %s provider makes readiness error', async provider => {
  process.env.STORAGE_PROVIDER = provider;
  const result = await health();
  expect(result.status).toBe('error');
  expect(result.components.storage).toMatchObject({ status: 'error', adapterReady: false });
});
