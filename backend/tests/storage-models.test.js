import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { Sequelize } from 'sequelize';

// Defining/validating models is offline; never authenticate or sync this instance.
const sequelize = new Sequelize('unused', 'unused', 'unused', { dialect: 'postgres', logging: false });
jest.unstable_mockModule('../src/config/database.js', () => ({ sequelize }));
jest.unstable_mockModule('dotenv', () => ({ default: { config: jest.fn() } }));
let directory;
let originalEnv;
let DataFile;

beforeEach(async () => {
  jest.resetModules();
  originalEnv = process.env;
  directory = await fs.mkdtemp(path.join(tmpdir(), 'geoport-storage-model-'));
  process.env = { ...process.env, STORAGE_PROVIDER: 'local',
    UPLOADS_ROOT: path.join(directory, 'uploads'), DATA_ROOT: path.join(directory, 'data') };
  ({ DataFile } = await import('../src/models/DataFile.js'));
});

afterEach(async () => {
  process.env = originalEnv;
  await fs.rm(directory, { recursive: true, force: true });
});

function build(storagePath, storageType = 'local') {
  return DataFile.build({ projectId: '00000000-0000-4000-8000-000000000001',
    fileName: 'sample', fileType: 'other', fileSize: 1, storagePath, storageType });
}

test.each(['UPLOADS_ROOT', 'DATA_ROOT'])('local model writes normalize %s to portable storage_path', async key => {
  const file = build(path.join(process.env[key], 'a.txt'));
  await file.validate();
  expect(file.storagePath).toBe(`${key === 'UPLOADS_ROOT' ? 'uploads' : 'data'}/a.txt`);
});

test('local model writes reject outside paths', async () => {
  await expect(build('/etc/passwd').validate()).rejects.toThrow('outside allowed roots');
});

test('external storage keys are not rewritten by local path normalization', async () => {
  const file = build('bucket-key/a.txt', 's3');
  await file.validate();
  expect(file.storagePath).toBe('bucket-key/a.txt');
});
