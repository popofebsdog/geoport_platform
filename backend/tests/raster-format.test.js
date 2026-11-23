import { jest, beforeAll, afterAll, beforeEach, afterEach, test, expect } from '@jest/globals';
import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const projectId = '11111111-1111-4111-8111-111111111111';
const create = jest.fn();
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: {}, sequelize: { define: () => ({}), transaction: async cb => cb({}) } }));
jest.unstable_mockModule('../src/models/Project.js', () => ({ Project: { findByPk: async () => ({ projectId }) } }));
jest.unstable_mockModule('../src/models/DataFile.js', () => ({ DataFile: { create } }));
jest.unstable_mockModule('dotenv', () => ({ default: { config() {} } }));
const hasGDAL = spawnSync('gdal_create', ['--version']).status === 0;
let root, previousEnv, uploadData;
beforeEach(async () => {
  jest.resetModules(); jest.clearAllMocks();
  previousEnv = process.env;
  root = await fs.mkdtemp(path.join(tmpdir(), 'geoport-raster-'));
  process.env = { ...previousEnv, UPLOADS_ROOT: root, DATA_ROOT: path.join(root, 'data') };
  ({ uploadData } = await import('../src/controllers/dataController.js'));
  create.mockImplementation(async data => ({ ...data, toJSON: () => data }));
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => { process.env = previousEnv; jest.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

for (const type of ['Byte', 'Float32']) {
  (hasGDAL ? test : test.skip)(`real COG conversion preserves ${type} values, nodata semantics, and original TIFF`, async () => {
    const input = path.join(root, 'original.tiff');
    execFileSync('gdal_create', ['-of', 'GTiff', '-outsize', '8', '8', '-bands', '1', '-burn', type === 'Byte' ? '0' : '1.25', '-ot', type,
      '-a_ullr', '121', '25', '122', '24', '-a_srs', 'EPSG:4326', input]);
    const bytes = await fs.readFile(input);
    const originalHash = createHash('sha256').update(bytes).digest('hex');
    const res = response();
    await uploadData({ body: { project_id: projectId, data_name: 'Raster fixture', data_type: 'basemap', data_date: '2026-11-22' },
      file: { path: input, originalname: 'original.tiff', size: bytes.length, mimetype: 'image/tiff' } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const output = create.mock.calls[0][0];
    const info = JSON.parse(execFileSync('gdalinfo', ['-json', '-stats', path.join(root, path.basename(output.storagePath))], { encoding: 'utf8' }));
    expect(info.bands).toHaveLength(1);
    expect(info.bands[0].type).toBe(type);
    expect(info.bands[0].noDataValue).toBeUndefined();
    expect(Number(info.bands[0].metadata[''].STATISTICS_MINIMUM)).toBe(type === 'Byte' ? 0 : 1.25);
    expect(createHash('sha256').update(await fs.readFile(input)).digest('hex')).toBe(originalHash);
    expect(output.metadata.original_storage_path).toBe('uploads/original.tiff');
    expect(output.originalName).toBe('original.tiff');
  });
}

test('invalid TIFF content fails explicitly instead of being accepted as a usable basemap', async () => {
  const input = path.join(root, 'fake.tif'); await fs.writeFile(input, 'not a tiff');
  const res = response();
  await uploadData({ body: { project_id: projectId, data_name: 'Fake', data_type: 'basemap', data_date: '2026-11-22', enable_cog: 'false' },
    file: { path: input, originalname: 'fake.tif', size: 10, mimetype: 'image/tiff' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(create).not.toHaveBeenCalled();
});

(hasGDAL ? test : test.skip)('disabling COG leaves the original file unconverted and accurately records the setting', async () => {
  const input = path.join(root, 'source.tif');
  execFileSync('gdal_create', ['-of', 'GTiff', '-outsize', '2', '2', '-bands', '1', '-burn', '3', '-a_ullr', '121', '25', '122', '24', '-a_srs', 'EPSG:4326', input]);
  const size = (await fs.stat(input)).size;
  const res = response();
  await uploadData({ body: { project_id: projectId, data_name: 'Unoptimized', data_type: 'basemap', data_date: '2026-11-22', enable_cog: 'false' },
    file: { path: input, originalname: 'source.tif', size, mimetype: 'image/tiff' } }, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(create.mock.calls[0][0]).toMatchObject({ storagePath: 'uploads/source.tif', metadata: { cog_optimized: false } });
});

(hasGDAL ? test : test.skip)('a virtual raster renamed as TIFF cannot enter the GeoTIFF processing pipeline', async () => {
  const source = path.join(root, 'source.tif'), disguised = path.join(root, 'disguised.tif');
  execFileSync('gdal_create', ['-of', 'GTiff', '-outsize', '2', '2', '-bands', '1', '-burn', '3', '-a_ullr', '121', '25', '122', '24', '-a_srs', 'EPSG:4326', source]);
  execFileSync('gdal_translate', ['-of', 'VRT', source, disguised]);
  const res = response();
  await uploadData({ body: { project_id: projectId, data_name: 'Disguised', data_type: 'basemap', data_date: '2026-11-22', enable_cog: 'false' },
    file: { path: disguised, originalname: 'disguised.tif', size: (await fs.stat(disguised)).size, mimetype: 'image/tiff' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(create).not.toHaveBeenCalled();
});
