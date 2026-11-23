import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const query = jest.fn();
const exec = jest.fn();
const execFile = jest.fn();
const client = { query: jest.fn(), release: jest.fn() };
const createFile = jest.fn();
const projectId = '11111111-1111-4111-8111-111111111111';
jest.unstable_mockModule('../src/config/database.js', () => ({
  pool: { query, connect: jest.fn(async () => client) },
  sequelize: { define: () => ({}), transaction: async callback => callback({}) }
}));
jest.unstable_mockModule('../src/models/DataFile.js', () => ({ DataFile: { create: createFile } }));
jest.unstable_mockModule('../src/models/Project.js', () => ({ Project: { findByPk: async () => ({ projectId }) } }));
jest.unstable_mockModule('dotenv', () => ({ default: { config: jest.fn() } }));
jest.unstable_mockModule('child_process', () => ({ exec, execFile }));

let directory;
let originalEnv;
let storage;

beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();
  createFile.mockImplementation(async data => ({ ...data, fileId: 'file', toJSON: () => ({ ...data, fileId: 'file' }) }));
  originalEnv = process.env;
  directory = await fs.mkdtemp(path.join(tmpdir(), 'geoport-storage-'));
  process.env = {
    ...process.env, STORAGE_PROVIDER: 'local',
    UPLOADS_ROOT: path.join(directory, 'media'), DATA_ROOT: path.join(directory, 'datasets')
  };
  storage = await import('../src/services/storageService.js');
  await storage.ensureLocalStorageRoots();
  const mkdir = fs.mkdir.bind(fs);
  const mkdirSync = fsSync.mkdirSync.bind(fsSync);
  const callbackMkdir = fsSync.mkdir.bind(fsSync);
  // Keep legacy destinations harmless during the red run, too.
  jest.spyOn(fs, 'mkdir').mockImplementation((target, options) =>
    target.startsWith(`${directory}${path.sep}`) ? mkdir(target, options) : Promise.resolve());
  jest.spyOn(fsSync, 'mkdirSync').mockImplementation((target, options) =>
    target.startsWith(`${directory}${path.sep}`) ? mkdirSync(target, options) : undefined);
  jest.spyOn(fsSync, 'mkdir').mockImplementation((target, options, callback) => {
    if (target.startsWith(`${directory}${path.sep}`)) return callbackMkdir(target, options, callback);
    callback(null);
  });
});

afterEach(async () => {
  process.env = originalEnv;
  jest.restoreAllMocks();
  await fs.rm(directory, { recursive: true, force: true });
});

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn(), sendFile: jest.fn(), setHeader: jest.fn() };
}

test.each(['uploads/a.csv', '/uploads/a.csv', 'uploads\\a.csv'])('resolves upload namespace %s', value => {
  expect(storage.resolveStoragePath(value)).toBe(path.join(process.env.UPLOADS_ROOT, 'a.csv'));
});

test.each(['data/a.csv', '/data/a.csv', '../data/a.csv'])('resolves data namespace %s', value => {
  expect(storage.resolveStoragePath(value)).toBe(path.join(process.env.DATA_ROOT, 'a.csv'));
});

test.each(['uploads/../../escape', 'data/../../escape', '/etc/passwd', 'uploads-evil/file']) (
  'rejects outside or ambiguous paths %s', value => {
    expect(storage.resolveStoragePath(value)).toBeNull();
  }
);

test('serializes configured absolute paths as portable namespaces', () => {
  for (const [root, prefix] of [[process.env.UPLOADS_ROOT, 'uploads'], [process.env.DATA_ROOT, 'data']]) {
    const filename = path.join(root, 'nested/a.csv');
    expect(storage.toStoragePath(filename)).toBe(`${prefix}/nested/a.csv`);
    expect(storage.resolveStoragePath(storage.toStoragePath(filename))).toBe(filename);
  }
});

test('legacy default absolute paths rebase onto configured roots', () => {
  const backend = fileURLToPath(new URL('../', import.meta.url));
  expect(storage.resolveStoragePath(path.join(backend, 'uploads/a.txt'))).toBe(path.join(process.env.UPLOADS_ROOT, 'a.txt'));
  expect(storage.resolveStoragePath(path.join(backend, '../data/a.txt'))).toBe(path.join(process.env.DATA_ROOT, 'a.txt'));
});

test('relative roots are backend-relative even when cwd reports another directory', async () => {
  process.env.UPLOADS_ROOT = 'custom-uploads';
  process.env.DATA_ROOT = '../custom-data';
  jest.spyOn(process, 'cwd').mockReturnValue(directory);
  jest.resetModules();
  const { storageConfig } = await import('../src/services/storageService.js');
  const backend = fileURLToPath(new URL('../', import.meta.url));
  expect(storageConfig.uploadsRoot).toBe(path.join(backend, 'custom-uploads'));
  expect(storageConfig.dataRoot).toBe(path.resolve(backend, '../custom-data'));
});

test('data namespace stat, read and delete target DATA_ROOT', async () => {
  const file = path.join(process.env.DATA_ROOT, 'a.csv');
  await fs.writeFile(file, 'x,y\n1,2');
  expect(await storage.statStoragePath('data/a.csv')).toMatchObject({ exists: true, path: file });
  const stream = await storage.storageAdapter.readStream('data/a.csv');
  let contents = '';
  for await (const chunk of stream) contents += chunk;
  expect(contents).toBe('x,y\n1,2');
  expect(await storage.storageAdapter.delete('data/a.csv')).toMatchObject({ deleted: true, path: file });
  await expect(fs.stat(file)).rejects.toMatchObject({ code: 'ENOENT' });
});

test('public URLs use configured prefixes without leaking absolute roots', () => {
  storage.storageConfig.uploadsPublicPath = '/media';
  storage.storageConfig.dataPublicPath = '/datasets';
  expect(storage.storageAdapter.publicUrl(path.join(process.env.UPLOADS_ROOT, 'a.png'))).toBe('/media/a.png');
  expect(storage.storageAdapter.publicUrl('data/a.csv')).toBe('/datasets/a.csv');
  expect(storage.storageAdapter.publicUrl('/etc/passwd')).toBeNull();
});

test('configured public paths resolve to the same files as canonical storage paths', () => {
  storage.storageConfig.uploadsPublicPath = '/assets/media';
  storage.storageConfig.dataPublicPath = '/datasets';
  expect(storage.resolveStoragePath('/assets/media/a.png')).toBe(path.join(process.env.UPLOADS_ROOT, 'a.png'));
  expect(storage.resolveStoragePath('/datasets/a.csv')).toBe(path.join(process.env.DATA_ROOT, 'a.csv'));
  expect(storage.resolveStoragePath('/assets/media/../../escape')).toBeNull();
});

test('nested configured roots retain the explicit data namespace', () => {
  storage.storageConfig.dataRoot = path.join(process.env.UPLOADS_ROOT, 'datasets');
  expect(storage.toStoragePath(path.join(storage.storageConfig.dataRoot, 'a.csv'))).toBe('data/a.csv');
});

test('directoryStats rejects a missing root rather than reporting empty storage', async () => {
  await expect(storage.directoryStats(path.join(directory, 'missing'))).rejects.toMatchObject({ code: 'ENOENT' });
});

test('directoryStats counts readable nested files', async () => {
  const root = process.env.DATA_ROOT;
  await fs.mkdir(path.join(root, 'nested'));
  await fs.writeFile(path.join(root, 'a.txt'), 'abc');
  await fs.writeFile(path.join(root, 'nested/b.txt'), 'defg');
  expect(await storage.directoryStats(root)).toEqual({ path: root, fileCount: 2, totalBytes: 7 });
});

test('directoryStats propagates nested read failures', async () => {
  const nested = path.join(process.env.UPLOADS_ROOT, 'nested');
  await fs.mkdir(nested);
  const readdir = fs.readdir.bind(fs);
  jest.spyOn(fs, 'readdir').mockImplementation((target, options) => {
    if (target === nested) return Promise.reject(Object.assign(new Error('denied'), { code: 'EACCES' }));
    return readdir(target, options);
  });
  await expect(storage.directoryStats(process.env.UPLOADS_ROOT)).rejects.toMatchObject({ code: 'EACCES' });
});

test.each([
  ['dataController', 'upload', 'data/others'],
  ['dataController', 'featureUpload', 'features'],
  ['temporalDataController', 'upload', 'temporal'],
  ['temporalDataEnhancedController', 'upload', 'temporal'],
  ['childProjectMediaController', 'upload', 'data/child-project-media'],
  ['disasterPointController', 'upload', 'data/disaster-points/default']
])('%s %s creates its destination beneath UPLOADS_ROOT', async (name, exportName, suffix) => {
  const controller = await import(`../src/controllers/${name}.js`);
  const destination = await new Promise((resolve, reject) => {
    controller[exportName].storage.getDestination({ body: {} }, { mimetype: 'text/plain' }, (error, value) => {
      if (error) reject(error); else resolve(value);
    });
  });
  expect(destination).toBe(path.join(process.env.UPLOADS_ROOT, suffix));
  expect((await fs.stat(destination)).isDirectory()).toBe(true);
});

test('data upload hashes the absolute file but stores a portable path', async () => {
  const { uploadData } = await import('../src/controllers/dataController.js');
  const filePath = path.join(process.env.UPLOADS_ROOT, 'sample.txt');
  await fs.writeFile(filePath, 'sample');
  query.mockResolvedValue({ rows: [{ project_id: 'project' }] });
  client.query.mockImplementation(async sql => ({ rows: sql.includes('INSERT INTO data_files') ? [{ file_id: 'file' }] : [] }));
  const res = response();
  await uploadData({ body: { project_id: projectId, data_name: 'sample', data_date: '2026-01-01' },
    file: { path: filePath, originalname: 'sample.txt', mimetype: 'text/plain', size: 6 } }, res);
  expect(createFile).toHaveBeenCalledWith(expect.objectContaining({ storagePath: 'uploads/sample.txt', fileHash: expect.stringMatching(/^[0-9a-f]{64}$/) }), expect.anything());
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test('generated COG stays under UPLOADS_ROOT and stores a relative path', async () => {
  const { uploadData } = await import('../src/controllers/dataController.js');
  const input = path.join(process.env.UPLOADS_ROOT, 'source.tif');
  const output = path.join(process.env.UPLOADS_ROOT, 'source_cog.tif');
  await fs.writeFile(input, 'original');
  execFile.mockImplementation((command, _args, _options, callback) => {
    if (command === 'gdalinfo') return callback(null, { stdout: JSON.stringify({ coordinateSystem: { wkt: 'EPSG:4326' }, geoTransform: [121, 1, 0, 24, 0, -1] }), stderr: '' });
    fs.writeFile(output, 'converted').then(() => callback(null, '', ''), callback);
  });
  query.mockResolvedValue({ rows: [{ project_id: 'project' }] });
  client.query.mockImplementation(async sql => ({ rows: sql.includes('INSERT INTO data_files') ? [{ file_id: 'file' }] : [] }));
  const res = response();
  await uploadData({ body: { project_id: projectId, data_name: 'map', data_date: '2026-01-01', data_type: 'basemap' },
    file: { path: input, originalname: 'source.tif', mimetype: 'image/tiff', size: 8 } }, res);
  expect(await fs.readFile(output, 'utf8')).toBe('converted');
  expect(await fs.readFile(input, 'utf8')).toBe('original');
  expect(createFile).toHaveBeenCalledWith(expect.objectContaining({ storagePath: 'uploads/source_cog.tif', originalName: 'source.tif', metadata: expect.objectContaining({ original_storage_path: 'uploads/source.tif' }) }), expect.anything());
  expect(execFile.mock.calls[1][1].slice(-2)).toEqual([input, output]);
  expect(execFile.mock.calls[1][1]).not.toContain('-a_nodata');
});

test('feature attachments store portable paths', async () => {
  const { uploadToFeature } = await import('../src/controllers/dataController.js');
  const filename = path.join(process.env.UPLOADS_ROOT, 'a.png');
  await fs.writeFile(filename, 'image');
  query.mockResolvedValue({ rows: [{ file_id: 'file' }] });
  const res = response();
  await uploadToFeature({ body: { data_files_id: 'file', feature_id: 'feature', upload_name: 'image' },
    file: { path: filename, originalname: 'a.png', filename: 'a.png', mimetype: 'image/png', size: 5 } }, res);
  const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO feature_uploads'));
  expect(insert?.[1][10]).toBe('uploads/a.png');
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test('monitoring reads use the configured upload root', async () => {
  const { serveMonitoringFile } = await import('../src/controllers/warningRegionController.js');
  const filename = path.join(process.env.UPLOADS_ROOT, 'monitoring/region/a.json');
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, '{}');
  const res = response();
  await serveMonitoringFile({ query: { path: 'uploads/monitoring/region/a.json' } }, res);
  expect(res.sendFile).toHaveBeenCalledWith(filename);
});

test('temporal JSON download uses the configured upload root', async () => {
  const { downloadTemporalDataJson } = await import('../src/controllers/temporalDataEnhancedController.js');
  const filename = path.join(process.env.UPLOADS_ROOT, 'temporal/temporal_data_test.json');
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, '{}');
  const res = response();
  await downloadTemporalDataJson({ params: { temporalId: 'test' } }, res);
  expect(res.sendFile).toHaveBeenCalledWith(filename);
});

test('new child media stores a relative path but returns an absolute public URL', async () => {
  const { uploadChildProjectMedia } = await import('../src/controllers/childProjectMediaController.js');
  query.mockResolvedValue({ rows: [{ media_id: 'media' }] });
  const res = response();
  await uploadChildProjectMedia({ params: { projectId: 'project' }, files: [{
    path: path.join(process.env.UPLOADS_ROOT, 'data/child-project-media/a.png'),
    filename: 'a.png', originalname: 'a.png', mimetype: 'image/png', size: 10
  }] }, res);
  expect(query.mock.calls[0][1][7]).toBe('uploads/data/child-project-media/a.png');
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({
    url: '/uploads/data/child-project-media/a.png', thumbnail: '/uploads/data/child-project-media/a.png'
  })] }));
});

test.each(['uploads/a.png', '/uploads/a.png', 'data/a.png'])('child media deletion resolves %s against configured roots', async stored => {
  const { deleteChildProjectMedia } = await import('../src/controllers/childProjectMediaController.js');
  const filename = storage.resolveStoragePath(stored);
  await fs.writeFile(filename, 'image');
  query.mockResolvedValue({ rows: [{ media_id: 'media', storage_path: stored }] });
  const res = response();
  await deleteChildProjectMedia({ params: { projectId: 'project', mediaId: 'media' } }, res);
  await expect(fs.stat(filename)).rejects.toMatchObject({ code: 'ENOENT' });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test.each(['uploads/a.csv', 'data/a.csv'])('CSV column parsing resolves portable path %s', async stored => {
  const { getAvailableColumns } = await import('../src/controllers/temporalDataParserController.js');
  await fs.writeFile(storage.resolveStoragePath(stored), 'time,value\n2026-01-01,2\n');
  query.mockResolvedValue({ rows: [{ storage_path: stored }] });
  const res = response();
  await getAvailableColumns({ params: { temporalId: 'temporal' } }, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true,
    data: expect.objectContaining({ columns: ['time', 'value'] }) }));
});
