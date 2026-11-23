import { jest, beforeEach, test, expect } from '@jest/globals';

const query = jest.fn();
const getDeepHealth = jest.fn();
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: { query } }));
jest.unstable_mockModule('../src/services/healthService.js', () => ({
  getDeepHealth, checkTitilerHealth: async () => ({ status: 'ok' })
}));
jest.unstable_mockModule('../src/services/storageService.js', () => ({
  directoryStats: async () => ({ fileCount: 0, totalBytes: 0 }),
  statStoragePath: jest.fn(), storageConfig: { uploadsRoot: '/unused', dataRoot: '/unused' }
}));
const { getAdminHealth } = await import('../src/controllers/adminController.js');
beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [{ count: 0 }] });
});

test('admin health includes pending migrations and never reports them as normal', async () => {
  getDeepHealth.mockResolvedValue({ status: 'warning', checkedAt: 'fixture', components: {
    database: { status: 'ok' }, titiler: { status: 'ok' }, storage: { status: 'ok', uploads: {}, data: {} },
    migrations: { status: 'warning', pendingCount: 2, checksumMismatches: ['001.sql'], message: 'Migration versions differ' }
  } });
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await getAdminHealth({}, res);
  expect(res.json.mock.calls[0][0]).toMatchObject({ status: 'warning', migrations: { pendingCount: 2 } });
  expect(res.json.mock.calls[0][0].issues.join(' ')).toMatch(/Migration versions differ/);
});

test('a deep-health database error remains an error in admin health', async () => {
  getDeepHealth.mockResolvedValue({ status: 'error', components: {
    database: { status: 'error', message: 'Missing core table' }, titiler: { status: 'ok' },
    storage: { status: 'ok' }, migrations: { status: 'ok' }
  } });
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await getAdminHealth({}, res);
  expect(res.json.mock.calls[0][0]).toMatchObject({ status: 'error', services: { database: { status: 'error' } } });
});
