import { jest, beforeEach, afterAll, test, expect } from '@jest/globals';
import path from 'node:path';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';

const previousUploadsRoot = process.env.UPLOADS_ROOT;
const directory = await fs.mkdtemp(path.join(tmpdir(), 'geoport-temporal-lifecycle-'));
process.env.UPLOADS_ROOT = directory;
afterAll(async () => {
  if (previousUploadsRoot === undefined) delete process.env.UPLOADS_ROOT;
  else process.env.UPLOADS_ROOT = previousUploadsRoot;
  await fs.rm(directory, { recursive: true, force: true });
});

const client = { query: jest.fn(), release: jest.fn() };
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: { connect: async () => client } }));
jest.unstable_mockModule('../src/services/csvService.js', () => ({
  readCSVColumns: async () => ['time', 'value'],
  readCSV: async () => ({ rows: [{ time: '0', value: '1' }] }),
  parseCSVNumber: value => Number(value)
}));
const { uploadTemporalData, updateTemporalData, deleteTemporalData } = await import('../src/controllers/temporalDataEnhancedController.js');
const { storageConfig } = await import('../src/services/storageService.js');

beforeEach(() => {
  jest.clearAllMocks();
  client.query.mockResolvedValue({ rows: [] });
});

test.each([
  ['missing upload file', uploadTemporalData, 400],
  ['missing update record', updateTemporalData, 404],
  ['missing delete record', deleteTemporalData, 404]
])('%s rolls back before returning its connection', async (_label, handler, status) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await handler({ params: { projectId: 'fixture', temporalId: 'fixture' }, body: {} }, res);
  expect(res.status).toHaveBeenCalledWith(status);
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(client.query.mock.invocationCallOrder.at(-1)).toBeLessThan(client.release.mock.invocationCallOrder[0]);
});

test('successful CSV upload persists completed file status before commit', async () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await uploadTemporalData({ params: { projectId: 'fixture' },
    body: { name: 'CSV', longitude: 121, latitude: 24, xAxisColumns: ['time'], yAxisColumns: ['value'] },
    file: { path: path.join(storageConfig.uploadsRoot, 'temporal', 'review.csv'), filename: 'review.csv', originalname: 'review.csv', size: 15 }
  }, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  const insert = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO data_files'));
  expect(insert[1].at(-1)).toBe('completed');
  expect(client.query).toHaveBeenCalledWith('COMMIT');
});

test('malformed axis configuration removes only the rejected staged upload', async () => {
  const directory = await fs.mkdtemp(path.join(storageConfig.uploadsRoot, 'rejected-test-'));
  const file = path.join(directory, 'rejected.csv');
  const keep = path.join(directory, 'existing.csv');
  await fs.writeFile(file, 'time,value\n0,1');
  await fs.writeFile(keep, 'keep');
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  try {
    await uploadTemporalData({ params: { projectId: 'fixture' }, body: { xAxisColumns: '[' },
      file: { path: file, filename: 'rejected.csv', originalname: 'rejected.csv' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    await expect(fs.access(file)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(keep, 'utf8')).toBe('keep');
    expect(client.release).toHaveBeenCalledTimes(1);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
