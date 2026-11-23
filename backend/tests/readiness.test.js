import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import { Sequelize } from 'sequelize';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { request } from 'node:http';

let database;
let directory;
let server;
let originalEnv;
let missingCore;
jest.unstable_mockModule('../src/middleware/privateDataAccess.js', () => ({
  requireDataAccount: (_req, _res, next) => next(),
  requireStoredAsset: (_req, _res, next) => next(),
  ASSET_COOKIE: 'geoport_asset_session', assetCookieOptions: () => ({ path: '/' })
}));
jest.unstable_mockModule('../src/config/database.js', () => ({
  sequelize: database,
  pool: { query: async (_sql, params) => params
    ? { rows: params[0].filter(name => !missingCore || name !== 'users').map(table_name => ({ table_name })) }
    : { rows: [{ exists: false }] } },
  testConnection: jest.fn(), testPoolConnection: jest.fn()
}));

beforeEach(async () => {
  jest.resetModules();
  originalEnv = process.env;
  directory = await fs.mkdtemp(path.join(tmpdir(), 'geoport-readiness-'));
  process.env = { ...originalEnv, NODE_ENV: 'test', LOG_LEVEL: 'silent', STORAGE_PROVIDER: 'local',
    UPLOADS_ROOT: path.join(directory, 'uploads'), DATA_ROOT: path.join(directory, 'data') };
  await fs.mkdir(process.env.UPLOADS_ROOT);
  await fs.mkdir(process.env.DATA_ROOT);
  database = new Sequelize('unused', 'unused', 'unused', { dialect: 'postgres', logging: false });
  missingCore = false;
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ versions: { titiler: 'test' } }) });
});
afterEach(async () => {
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  server = undefined;
  await database.close();
  await fs.rm(directory, { recursive: true, force: true });
  process.env = originalEnv;
  jest.restoreAllMocks();
});

async function readiness() {
  const { default: app } = await import('../src/app.js');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  return new Promise((resolve, reject) => {
    request({ host: '127.0.0.1', port: server.address().port, path: '/api/health/deep' }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    }).on('error', reject).end();
  });
}

test('working storage/core tables with pending migrations returns 200 warning', async () => {
  const result = await readiness();
  expect(result.status).toBe(200);
  expect(result.body.status).toBe('warning');
});
test('an inaccessible storage root returns HTTP 503', async () => {
  await fs.rmdir(process.env.UPLOADS_ROOT);
  const result = await readiness();
  expect(result.status).toBe(503);
  expect(result.body.components.storage.status).toBe('error');
});
test('a missing core table returns HTTP 503', async () => {
  missingCore = true;
  const result = await readiness();
  expect(result.status).toBe(503);
  expect(result.body.components.database.coreTables.missing).toEqual(['users']);
});
