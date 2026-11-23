import { jest, test, expect, afterAll } from '@jest/globals';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'geoport-report-map-'));
const assets = new Map();
jest.unstable_mockModule('../src/services/projectSnapshotService.js', () => ({ resolvePublicationAsset: async (_kind, _id, _collection, id) => assets.get(id) }));
afterAll(() => fs.rm(directory, { recursive: true, force: true }));

const maps = await import('../src/services/projectReportMapService.js').catch(() => ({}));
const snapshot = { kind: 'disaster', project: { name: '現地專案', location: { longitude: 121.4, latitude: 24.6 } }, children: [], points: [], layers: [] };
test('reports render actual basemap pixels under project markers with visible attribution', async () => {
  expect(typeof maps.renderReportMap).toBe('function');
  const tile = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#a5c784' } }).png().toBuffer();
  const requested = [];
  const result = await maps.renderReportMap(snapshot, { tileLoader: async (...args) => { requested.push(args); return tile; } });
  expect(requested.length).toBeGreaterThan(1); expect(requested.length).toBeLessThanOrEqual(15);
  expect(result.attribution).toContain('OpenStreetMap');
  const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
  expect(info.width).toBe(1000); expect(info.height).toBe(500);
  const offset = (100 * info.width + 100) * info.channels;
  expect([...data.subarray(offset, offset + 3)]).toEqual([165, 199, 132]);
});
test('a road layer provides geographic extent when a warning project has no center coordinates', async () => {
  expect(typeof maps.renderReportMap).toBe('function');
  const tile = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#d6e4e8' } }).png().toBuffer();
  const result = await maps.renderReportMap({ ...snapshot, kind: 'warning', project: { name: '監測路段', location: null } }, {
    roadLoader: async () => [[[121.4, 24.6], [121.42, 24.62]]], tileLoader: async () => tile
  });
  expect(result.buffer.length).toBeGreaterThan(1000);
});
test('an unavailable basemap cannot silently turn into a blank coordinate grid', async () => {
  expect(typeof maps.renderReportMap).toBe('function');
  await expect(maps.renderReportMap(snapshot, { tileLoader: async () => { throw new Error('offline'); } }))
    .rejects.toMatchObject({ status: 503 });
});
test('projects with no coordinates or owned road data do not invent a location', async () => {
  expect(typeof maps.renderReportMap).toBe('function');
  expect(await maps.renderReportMap({ ...snapshot, project: { location: null } })).toBeNull();
});
test('coincident project markers share a label instead of overlapping numbers', async () => {
  const tile = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#a5c784' } }).png().toBuffer();
  const result = await maps.renderReportMap({ ...snapshot, children: [
    { name: '調查 A', location: { longitude: 121.405, latitude: 24.605 } },
    { name: '調查 B', location: { longitude: 121.405, latitude: 24.605 } }
  ] }, { tileLoader: async () => tile });
  expect(result.legend).toHaveLength(2);
  expect(result.legend[1]).toMatch(/^2, 3 /);
});
test('a global extent keeps its final zoom and viewport coordinates consistent', async () => {
  const tile = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#a5c784' } }).png().toBuffer();
  const result = await maps.renderReportMap({ ...snapshot, project: { location: { longitude: -179, latitude: 84 } },
    points: [{ longitude: 179, latitude: -84 }] }, { tileLoader: async () => tile });
  expect(result.zoom).toBe(0);
});
test('all owned road layers are considered when the first has no matching features', async () => {
  const tile = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#a5c784' } }).png().toBuffer();
  for (const [id, road] of [['other-road', '台9線'], ['selected-road', '台7線']]) {
    const file = path.join(directory, `${id}.geojson`);
    await fs.writeFile(file, JSON.stringify({ type: 'FeatureCollection', features: [
      { type: 'Feature', properties: { 公路編: road }, geometry: { type: 'Point', coordinates: [121.4, 24.6] } }
    ] }));
    assets.set(id, { path: file, size: (await fs.stat(file)).size });
  }
  const result = await maps.renderReportMap({ ...snapshot, kind: 'warning', project: { id: 'fixture', road: 'taiwan7', location: null },
    layers: ['other-road', 'selected-road'].map(id => ({ id, type: 'road', collection: 'layers' })) }, { tileLoader: async () => tile });
  expect(result).not.toBeNull();
  expect(result.buffer.length).toBeGreaterThan(1000);
});
