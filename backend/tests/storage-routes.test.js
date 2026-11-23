import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import multer from 'multer';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

const options = [];
const middleware = (_req, _res, next) => next();
jest.unstable_mockModule('multer', () => ({ default: Object.assign(config => {
  options.push(config);
  return { array: () => middleware, single: () => middleware };
}, { diskStorage: multer.diskStorage }) }));
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: { query: jest.fn() }, sequelize: { define: () => ({}) } }));
jest.unstable_mockModule('dotenv', () => ({ default: { config: jest.fn() } }));
let directory;
let originalEnv;
beforeEach(async () => {
  jest.resetModules();
  options.length = 0;
  originalEnv = process.env;
  directory = await fsp.mkdtemp(path.join(tmpdir(), 'geoport-storage-route-'));
  process.env = { ...originalEnv, UPLOADS_ROOT: path.join(directory, 'media'), DATA_ROOT: path.join(directory, 'data') };
  const mkdir = fs.mkdirSync.bind(fs);
  jest.spyOn(fs, 'mkdirSync').mockImplementation((target, ...args) => {
    if (target.startsWith(directory)) return mkdir(target, ...args);
  });
  await import('../src/routes/warningRegions.js');
});
afterEach(async () => {
  jest.restoreAllMocks();
  process.env = originalEnv;
  await fsp.rm(directory, { recursive: true, force: true });
});

function destination(config, regionCode = 'north') {
  if (config.dest) return Promise.resolve(config.dest);
  return new Promise((resolve, reject) => config.storage.getDestination(
    { params: { regionCode } }, { originalname: 'test.geojson' },
    (error, value) => error ? reject(error) : resolve(value)
  ));
}
test('warning project uploads use UPLOADS_ROOT', async () => {
  expect(await destination(options[0])).toBe(path.join(process.env.UPLOADS_ROOT, 'warning-regions'));
});
test('monitoring layer uploads use UPLOADS_ROOT', async () => {
  const result = await destination(options[1]);
  expect(result).toBe(path.join(process.env.UPLOADS_ROOT, 'monitoring/north'));
  expect((await fsp.stat(result)).isDirectory()).toBe(true);
});
test.each(['../escape', 'north/../../escape'])('monitoring destination rejects traversal %s', async code => {
  await expect(destination(options[1], code)).rejects.toThrow();
});
