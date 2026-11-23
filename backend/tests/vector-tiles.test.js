import { beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';

const implementation = new URL('../src/services/vectorTileService.js', import.meta.url);
if (!existsSync(implementation)) {
  test.todo('Implement the planned MVT service; the preserved contract below runs when its module exists');
} else {
const { VectorTileService, xyzForPoint, tileBounds } = await import(implementation.href);

jest.setTimeout(30000);
let root, service;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(tmpdir(), 'geoport-mvt-'));
  service = new VectorTileService({ root: path.join(root, 'cache'), concurrency: 2, queueLimit: 8 });
});
afterEach(async () => { await service.close(); await fs.rm(root, { recursive: true, force: true }); });
const point = (coordinates, id, properties = {}) => ({ type: 'Feature', id, properties, geometry: { type: 'Point', coordinates } });
const collection = features => ({ type: 'FeatureCollection', features });
async function source(data, name = 'source.geojson') {
  const filename = path.join(root, name);
  await fs.writeFile(filename, typeof data === 'string' ? data : JSON.stringify(data));
  return filename;
}
async function decoded(artifact, xyz = xyzForPoint(121.2, 24.8, 15)) {
  const result = await service.tile(artifact, xyz.z, xyz.x, xyz.y);
  const compressed = await fs.readFile(result.path);
  const tile = new VectorTile(new PbfReader(gunzipSync(compressed)));
  return { result, tile, features: tile.layers.features ? Array.from({ length: tile.layers.features.length }, (_, i) => tile.layers.features.feature(i)) : [] };
}

test('XYZ bounds use WebMercator and reject invalid or excessive coordinates', () => {
  expect(xyzForPoint(0, 0, 0)).toEqual({ z: 0, x: 0, y: 0 });
  const bounds = tileBounds(0, 0, 0);
  expect(bounds.minX).toBeCloseTo(-20037508.342789244);
  expect(bounds.maxY).toBeCloseTo(20037508.342789244);
  for (const args of [[-1, 0, 0], [21, 0, 0], [2, 4, 0], [2, -1, 0], [2, 0, 4], [2, 0.5, 0]]) expect(() => tileBounds(...args)).toThrow();
});

test('preparation keeps original bytes, creates a spatial index, and exposes no entire GeoJSON', async () => {
  const filename = await source(collection([point([121.2, 24.8, 9], 0, { risk: 4, nested: { kept: true }, '__gp_idx': 'user value' })]));
  const before = createHash('sha256').update(await fs.readFile(filename)).digest('hex');
  const artifact = await service.prepare(filename, '.geojson');
  expect(artifact.featureCount).toBe(1);
  expect(artifact.sourceSrid).toBe(4326);
  expect(artifact.bounds.minX).toBeCloseTo(121.2);
  expect(artifact.geojson).toBeUndefined();
  expect(artifact.cacheKey).toMatch(/^[0-9a-f]{64}$/);
  expect((await fs.stat(path.join(service.root, artifact.cacheKey, 'source.fgb'))).size).toBeGreaterThan(0);
  expect(createHash('sha256').update(await fs.readFile(filename)).digest('hex')).toBe(before);
  const feature = await service.feature(artifact, 0);
  expect(feature).toMatchObject({ featureId: 0, feature: { properties: { risk: 4, nested: { kept: true }, '__gp_idx': 'user value' } } });
});

test('native PBF tiles contain visible vectors, source indices, and style properties', async () => {
  const artifact = await service.prepare(await source(collection([point([121.2, 24.8], 'site-A', { risk: 4, name: 'survey' })])), '.geojson');
  const { features } = await decoded(artifact);
  expect(features).toHaveLength(1);
  expect(features[0].properties).toMatchObject({ '__gp_idx': 0, 'p:risk': 4, 'p:name': 'survey' });
  expect(features[0].type).toBe(1);
  expect((await service.feature(artifact, 0)).featureId).toBe('site-A');
});

test('far-away viewports return an empty valid MVT, not the complete dataset', async () => {
  const artifact = await service.prepare(await source(collection([point([121.2, 24.8], 1)])), '.geojson');
  const far = xyzForPoint(-73.9, 40.7, 15);
  const { features, result } = await decoded(artifact, far);
  expect(features).toHaveLength(0);
  expect((await fs.stat(result.path)).size).toBeLessThan(100);
});

test('concurrent preparation and cold requests are single-flight and then disk cache hits', async () => {
  const filename = await source(collection([point([121.2, 24.8], 1)]));
  const artifacts = await Promise.all(Array.from({ length: 20 }, () => service.prepare(filename, '.geojson')));
  expect(new Set(artifacts.map(item => item.cacheKey)).size).toBe(1);
  expect(service.stats.indexBuilds).toBe(1);
  const xyz = xyzForPoint(121.2, 24.8, 15);
  const responses = await Promise.all(Array.from({ length: 50 }, () => service.tile(artifacts[0], xyz.z, xyz.x, xyz.y)));
  expect(new Set(responses.map(item => item.path)).size).toBe(1);
  expect(service.stats.tileBuilds).toBe(1);
  await service.tile(artifacts[0], xyz.z, xyz.x, xyz.y);
  expect(service.stats.tileBuilds).toBe(1);
});

test('a restarted service uses immutable indexed data and tile cache without rebuilding', async () => {
  const filename = await source(collection([point([121.2, 24.8], 1)]));
  const artifact = await service.prepare(filename, '.geojson');
  const a = await decoded(artifact);
  const second = new VectorTileService({ root: service.root });
  try {
    const same = await second.prepare(filename, '.geojson');
    const xyz = xyzForPoint(121.2, 24.8, 15);
    expect((await second.tile(same, xyz.z, xyz.x, xyz.y)).path).toBe(a.result.path);
    expect(second.stats.indexBuilds).toBe(0);
    expect(second.stats.tileBuilds).toBe(0);
  } finally { await second.close(); }
});

test('TWD97 is reprojected on the server and long/nested attributes stay out of tiles but remain retrievable', async () => {
  const data = { ...collection([point([250000, 2700000, 8], 'TWD', { name: '台8', details: 'x'.repeat(5000), nested: [1, 2], risk: 0 })]),
    crs: { type: 'name', properties: { name: 'EPSG:3826' } } };
  const artifact = await service.prepare(await source(data), '.geojson');
  expect(artifact.sourceSrid).toBe(3826);
  const { features } = await decoded(artifact, xyzForPoint(121, 24.406111, 15));
  expect(features).toHaveLength(1);
  expect(features[0].properties['p:risk']).toBe(0);
  expect(features[0].properties['p:details']).toBeUndefined();
  expect((await service.feature(artifact, 0)).feature.properties).toMatchObject({ details: 'x'.repeat(5000), nested: [1, 2] });
});

test('KML retains attributes, compound geometry, and fallback feature IDs', async () => {
  const text = '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark id="site-A"><ExtendedData><Data name="risk"><value>7</value></Data></ExtendedData><MultiGeometry><Point><coordinates>121.2,24.8</coordinates></Point><LineString><coordinates>121.2,24.8 121.201,24.801</coordinates></LineString></MultiGeometry></Placemark><Placemark><Point><coordinates>121.2,24.8</coordinates></Point></Placemark></Document></kml>';
  const artifact = await service.prepare(await source(text, 'survey.kml'), '.kml');
  expect(artifact.featureCount).toBe(2);
  expect((await service.feature(artifact, 0)).featureId).toBe('site-A');
  expect((await service.feature(artifact, 0)).feature.properties.risk).toBe('7');
  expect((await service.feature(artifact, 1)).featureId).toBe(1);
  expect((await decoded(artifact)).features.length).toBeGreaterThanOrEqual(2);
});

test.each(['{broken', '{"type":"FeatureCollection","features":"wrong"}',
  JSON.stringify(collection([point(['121', 24], 1)])),
  JSON.stringify({ ...collection([point([121, 24], 1)]), crs: { properties: { name: 'EPSG:3857' } } })
])('bad inputs are rejected with no published partial artifacts: %s', async text => {
  await expect(service.prepare(await source(text), '.geojson')).rejects.toMatchObject({ status: 400 });
  expect((await fs.readdir(service.root)).filter(name => !name.startsWith('.'))).toEqual([]);
});

test('attributes are fetched by bounded ordinal lookup with validation, including id zero', async () => {
  const artifact = await service.prepare(await source(collection([point([121.2, 24.8], 0), point([121.2, 24.8], 'second')])), '.geojson');
  await expect(service.feature(artifact, -1)).rejects.toMatchObject({ status: 400 });
  await expect(service.feature(artifact, 1.5)).rejects.toMatchObject({ status: 400 });
  await expect(service.feature(artifact, 2)).rejects.toMatchObject({ status: 404 });
  expect((await service.feature(artifact, 0)).featureId).toBe(0);
});

test('numeric analysis summary is streamed rather than sending all features to the browser', async () => {
  const artifact = await service.prepare(await source(collection([point([121.2, 24.8], 0, { risk: 0 }), point([121.2, 24.8], 1, { risk: 10 })])), '.geojson');
  expect(artifact.analysisSummary.numericFields).toContain('risk');
  expect(artifact.analysisSummary.statistics.risk).toMatchObject({ min: 0, max: 10, mean: 5, count: 2 });
  expect(artifact.analysisSummary.statistics.risk.values).toBeUndefined();
});
}
