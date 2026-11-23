import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import express from 'express';

const projectId = '11111111-1111-4111-8111-111111111111';
const fileId = '22222222-2222-4222-8222-222222222222';
const query = jest.fn(), client = { query: jest.fn(), release: jest.fn() };
const files = { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn(), findOne: jest.fn() };
files.rawAttributes = Object.fromEntries([['fileId', 'file_id'], ['fileName', 'file_name'], ['originalName', 'original_name'],
  ['fileExtension', 'file_extension'], ['storagePath', 'storage_path'], ['fileHash', 'file_hash']].map(([key, field]) => [key, { field }]));
const layers = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn() };
const project = { findByPk: jest.fn() };
const transaction = jest.fn(async callback => callback({ fixture: true }));
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: { query, connect: async () => client },
  sequelize: { transaction, define: () => layers } }));
jest.unstable_mockModule('../src/models/DataFile.js', () => ({ DataFile: files }));
jest.unstable_mockModule('../src/models/Project.js', () => ({ Project: project }));
jest.unstable_mockModule('dotenv', () => ({ default: { config() {} } }));

let root, previousEnv, controller;
beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();
  previousEnv = process.env;
  root = await fs.mkdtemp(path.join(tmpdir(), 'geoport-format-'));
  process.env = { ...previousEnv, UPLOADS_ROOT: path.join(root, 'uploads'), DATA_ROOT: path.join(root, 'data') };
  await fs.mkdir(process.env.UPLOADS_ROOT);
  controller = await import('../src/controllers/dataController.js');
  project.findByPk.mockResolvedValue({ projectId });
  files.create.mockImplementation(async data => ({ ...data, fileId, toJSON: () => ({ ...data, fileId }) }));
  layers.create.mockImplementation(async data => data);
  query.mockResolvedValue({ rows: [{ project_id: projectId }] });
  client.query.mockImplementation(async (sql, values) => ({ rows: sql.includes('INSERT INTO data_files')
    ? [{ file_id: fileId, file_name: values[1], original_name: values[2], file_extension: values[3], storage_path: values[7], metadata: JSON.parse(values[10]) }]
    : [] }));
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => { process.env = previousEnv; jest.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() });
const geometry = coordinates => ({ type: 'Point', coordinates });
const collection = (coordinates = [121, 24, 32]) => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: null, geometry: geometry(coordinates) }] });
async function upload(name, content, body = {}) {
  const filename = path.join(process.env.UPLOADS_ROOT, name);
  await fs.writeFile(filename, content);
  const req = { body: { project_id: projectId, data_name: 'Survey', data_date: '2026-11-22', data_type: 'general', ...body },
    file: { path: filename, originalname: name, size: Buffer.byteLength(content), mimetype: 'application/octet-stream' } };
  const res = response();
  await controller.uploadData(req, res);
  return { res, filename };
}
const spatialWrite = () => layers.create.mock.calls[0]?.[0] || (() => {
  const args = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO spatial_layers'))?.[1];
  return args ? { geometry_type: args[5], srid: args[6], bbox_min_x: args[7], bbox_min_y: args[8], bbox_max_x: args[9], bbox_max_y: args[10], feature_count: args[11] } : null;
})();

test.each(['{broken', '{"type":"FeatureCollection","features":"not-an-array"}',
  JSON.stringify(collection(['121', 24])), JSON.stringify(collection([121, null])),
  JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[121, 24]] } }] })
])('malformed vector payload is rejected and cleaned up: %s', async content => {
  const { res, filename } = await upload('bad.geojson', content);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  expect(files.create).not.toHaveBeenCalled();
  expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT'))).toBe(false);
  await expect(fs.stat(filename)).rejects.toMatchObject({ code: 'ENOENT' });
});

test('UTF-8 BOM and .json GeoJSON are accepted as a spatial layer without altering original bytes', async () => {
  const content = '\uFEFF' + JSON.stringify(collection());
  const { res, filename } = await upload('survey.json', content);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(spatialWrite()).toMatchObject({ geometry_type: 'Point', feature_count: 1, srid: 4326, bbox_min_x: 121, bbox_min_y: 24 });
  expect(await fs.readFile(filename, 'utf8')).toBe(content);
});

test('validated vector upload is not left pending after its transaction commits', async () => {
  const { res } = await upload('complete.geojson', JSON.stringify(collection()));
  expect(res.status).toHaveBeenCalledWith(201);
  expect(files.create.mock.calls[0][0].processingStatus).toBe('completed');
});

test('TWD97 multi-geometries and GeometryCollection bounds are detected from all positions', async () => {
  const content = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: {
    type: 'GeometryCollection', geometries: [{ type: 'MultiPoint', coordinates: [[250000, 2700000, 8], [251000, 2702000, 9]] }] } }] };
  const { res } = await upload('multipoint.geojson', JSON.stringify(content));
  expect(res.status).toHaveBeenCalledWith(201);
  expect(spatialWrite()).toMatchObject({ geometry_type: 'Collection', feature_count: 1, srid: 3826,
    bbox_min_x: 250000, bbox_min_y: 2700000, bbox_max_x: 251000, bbox_max_y: 2702000 });
});

test('GeoJSON with an explicitly unsupported CRS is rejected, not silently treated as WGS84', async () => {
  const data = { ...collection([1000, 2000]), crs: { type: 'name', properties: { name: 'EPSG:3857' } } };
  const { res } = await upload('wrong-crs.geojson', JSON.stringify(data));
  expect(res.status).toHaveBeenCalledWith(400);
});

test('valid KML has actual geometry statistics rather than zero features', async () => {
  const { res } = await upload('survey.kml', '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><Point><coordinates>121.2,24.3,9</coordinates></Point></Placemark></Document></kml>');
  expect(res.status).toHaveBeenCalledWith(201);
  expect(spatialWrite()).toMatchObject({ feature_count: 1, geometry_type: 'Point', srid: 4326, bbox_min_x: 121.2, bbox_min_y: 24.3 });
});

test.each(['<kml><Placemark>', '<html><body>not KML</body></html>'])('invalid KML never receives completed spatial status: %s', async text => {
  const { res } = await upload('broken.kml', text);
  expect(res.status).toHaveBeenCalledWith(400);
});

test('CSV cannot be uploaded as a map layer with no coordinate mapping', async () => {
  const { res } = await upload('table.csv', 'date,rain\n2026-11-22,0');
  expect(res.status).toHaveBeenCalledWith(400);
});

test('missing metadata and nonexistent projects do not leave orphan uploads', async () => {
  const a = await upload('missing.geojson', JSON.stringify(collection()), { data_name: '' });
  expect(a.res.status).toHaveBeenCalledWith(400);
  await expect(fs.stat(a.filename)).rejects.toMatchObject({ code: 'ENOENT' });
  query.mockResolvedValue({ rows: [] }); project.findByPk.mockResolvedValue(null);
  const b = await upload('no-project.geojson', JSON.stringify(collection()));
  expect(b.res.status).toHaveBeenCalledWith(404);
  await expect(fs.stat(b.filename)).rejects.toMatchObject({ code: 'ENOENT' });
});

test('a standalone GeoJSON Feature is normalized for map rendering, but downloaded bytes remain original', async () => {
  const content = JSON.stringify(collection().features[0]);
  const { res, filename } = await upload('single.geojson', content);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(spatialWrite()).toMatchObject({ feature_count: 1, bbox_min_x: 121 });
  expect(await fs.readFile(filename, 'utf8')).toBe(content);
});

test.each(['normal.geojson', '臺8線測量.geojson'])('downloads preserve original name and exact bytes: %s', async originalName => {
  const content = Buffer.from(JSON.stringify(collection()));
  const storagePath = 'uploads/download.geojson';
  await fs.writeFile(path.join(process.env.UPLOADS_ROOT, 'download.geojson'), content);
  query.mockResolvedValue({ rows: [{ file_name: 'Map display name', original_name: originalName, file_extension: '.geojson', storage_path: storagePath, mime_type: 'application/geo+json' }] });
  files.findByPk.mockResolvedValue({ fileName: 'Map display name', originalName, fileExtension: '.geojson', storagePath, mimeType: 'application/geo+json' });
  const app = express(); app.get('/:id', controller.downloadFile);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(done => server.once('listening', done));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/${fileId}`);
    expect(response.status).toBe(200);
    const body = Buffer.from(await response.arrayBuffer());
    expect(createHash('sha256').update(body).digest('hex')).toBe(createHash('sha256').update(content).digest('hex'));
    const header = response.headers.get('content-disposition');
    expect(decodeURIComponent(header)).toContain(originalName);
  } finally { await new Promise(done => server.close(done)); }
});

test('vector list includes general/profile layers and .json GeoJSON, not just potential analysis', async () => {
  files.findAll.mockResolvedValue([{ fileId, fileName: 'General layer', fileExtension: '.json', fileType: 'vector', metadata: {}, createdAt: new Date() }]);
  layers.findAll.mockResolvedValue([{ source_file_id: fileId, layer_id: 'layer', processing_status: 'completed', bbox_min_x: '0', bbox_min_y: '0', bbox_max_x: '1', bbox_max_y: '1' }]);
  query.mockResolvedValue({ rows: [] });
  const res = response();
  await controller.getProjectGeoJSONList({ params: { projectId } }, res);
  expect(res.json.mock.calls[0][0].data).toHaveLength(1);
  expect(res.json.mock.calls[0][0].data[0]).toMatchObject({ file_id: fileId, bounds: [[0, 0], [1, 1]] });
});

test('real multipart upload -> GeoJSON presentation -> download preserves Chinese filenames and raw bytes', async () => {
  let stored;
  files.create.mockImplementation(async data => { stored = { ...data, fileId }; return { ...stored, toJSON: () => stored }; });
  files.findOne.mockImplementation(async () => stored);
  files.findByPk.mockImplementation(async () => stored);
  const app = express();
  app.post('/upload', controller.upload.single('file'), controller.uploadData);
  app.get('/view/:projectId', controller.getProjectGeoJSON);
  app.get('/download/:id', controller.downloadFile);
  const server = app.listen(0, '127.0.0.1'); await new Promise(done => server.once('listening', done));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const content = '\uFEFF' + JSON.stringify(collection().features[0]);
    const form = new FormData(); form.append('project_id', projectId); form.append('data_name', '地圖顯示名稱');
    form.append('data_date', '2026-11-22'); form.append('data_type', 'general');
    form.append('file', new Blob([content], { type: 'application/json' }), '臺8測量.json');
    const upload = await fetch(`${base}/upload`, { method: 'POST', body: form });
    expect(upload.status).toBe(201);
    expect((await upload.json()).data.original_name).toBe('臺8測量.json');
    const view = await fetch(`${base}/view/${projectId}?fileId=${fileId}`).then(r => r.json());
    expect(view.data.geojson.type).toBe('FeatureCollection');
    expect(view.data.geojson.features[0].geometry.coordinates).toEqual([121, 24, 32]);
    const download = await fetch(`${base}/download/${fileId}`);
    expect(Buffer.from(await download.arrayBuffer())).toEqual(Buffer.from(content));
    expect(decodeURIComponent(download.headers.get('content-disposition'))).toContain('臺8測量.json');
  } finally { await new Promise(done => server.close(done)); }
});

test('missing download returns JSON and never leaves the original image content type on the error', async () => {
  files.findByPk.mockResolvedValue({ fileName: 'Missing', originalName: 'image.tif', storagePath: 'uploads/missing.tif', mimeType: 'image/tiff' });
  const app = express(); app.get('/:id', controller.downloadFile);
  const server = app.listen(0, '127.0.0.1'); await new Promise(done => server.once('listening', done));
  try {
    const result = await fetch(`http://127.0.0.1:${server.address().port}/${fileId}`);
    expect(result.status).toBe(404);
    expect(result.headers.get('content-type')).toContain('application/json');
    expect((await result.json()).success).toBe(false);
  } finally { await new Promise(done => server.close(done)); }
});
