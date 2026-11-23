import { jest, test, expect, beforeAll, afterAll } from '@jest/globals';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const enabled = process.env.RUN_PUBLICATION_INTEGRATION === '1';
const check = enabled ? test : test.skip;
let server, sequelize, pool, Project, DataFile, User, ProjectShare, Region, Layer, signToken;
let root, base, user, authorization, parent, child, other, region, otherRegion, file, otherFile, layer, otherLayer, share;
const kept = Boolean(process.env.PUBLICATION_QA_OUTPUT);
beforeAll(async () => {
  if (!enabled) return;
  if (!/^geoport_publications_/.test(process.env.DB_NAME_TEST || '')) throw new Error('Use an isolated publication test database');
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'geoport-publication-'));
  process.env.UPLOADS_ROOT = path.join(root, 'uploads'); process.env.DATA_ROOT = path.join(root, 'data');
  process.env.REPORT_MAP_CACHE_DIR = path.join(root, 'map-cache');
  const fetchHttp = globalThis.fetch;
  const tile = await sharp({ create: { width: 256, height: 256, channels: 3, background: '#a5c784' } }).png().toBuffer();
  jest.spyOn(globalThis, 'fetch').mockImplementation((url, options) => String(url).startsWith('https://tile.openstreetmap.org/')
    ? Promise.resolve(new Response(tile, { headers: { 'Content-Type': 'image/png' } })) : fetchHttp(url, options));
  await fs.mkdir(process.env.UPLOADS_ROOT); await fs.mkdir(process.env.DATA_ROOT);
  ({ sequelize, pool } = await import('../src/config/database.js'));
  ({ Project } = await import('../src/models/Project.js')); ({ DataFile } = await import('../src/models/DataFile.js'));
  ({ User } = await import('../src/models/User.js')); ({ ProjectShare } = await import('../src/models/ProjectShare.js'));
  ({ WarningRegionLayer: Layer } = await import('../src/models/WarningRegionLayer.js'));
  ({ signToken } = await import('../src/services/authTokenService.js'));
  const { DataTypes } = await import('sequelize');
  const FixtureProject = sequelize.define('PublicationFixtureProject', { project_id: { type: DataTypes.UUID, primaryKey: true }, parent_project_id: DataTypes.UUID, is_parent: DataTypes.BOOLEAN }, { tableName: 'projects', timestamps: false, paranoid: false });
  Region = sequelize.define('PublicationFixtureRegion', { region_id: { type: DataTypes.UUID, primaryKey: true }, region_name: DataTypes.STRING,
    region_code: DataTypes.STRING, api_config: DataTypes.JSONB, deleted_at: DataTypes.DATE }, { tableName: 'warning_regions', timestamps: false, paranoid: false });
  user = await User.create({ username: `pub-${randomUUID().slice(0, 8)}`, email: `${randomUUID()}@example.test`, password_hash: 'fixture-hash', role: 'admin', is_active: true });
  authorization = { Authorization: `Bearer ${signToken(user)}` };
  parent = await Project.create({ name: '邊坡調查驗證專案', description: '僅限選定專案的調查資料。', locationGeometry: { type: 'Point', coordinates: [121.4, 24.6] } });
  child = await Project.create({ name: '現地調查紀錄' }); other = await Project.create({ name: '不得出現在分享中的其他專案' });
  await FixtureProject.update({ is_parent: true }, { where: { project_id: parent.projectId } });
  await FixtureProject.update({ parent_project_id: parent.projectId }, { where: { project_id: child.projectId } });
  region = await Region.create({ region_id: randomUUID(), region_name: '預警唯讀驗證專案', region_code: 'publication-fixture', api_config: {} });
  otherRegion = await Region.create({ region_id: randomUUID(), region_name: '同路線另一專案', region_code: 'publication-fixture', api_config: {} });
  const geojson = JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[121.4, 24.6], [121.42, 24.61]] } }] });
  await fs.writeFile(path.join(process.env.UPLOADS_ROOT, 'owned.geojson'), geojson);
  await fs.writeFile(path.join(process.env.UPLOADS_ROOT, 'other.txt'), 'other-project-only');
  file = await DataFile.create({ projectId: child.projectId, fileName: 'owned.geojson', originalName: '現地範圍.geojson', storagePath: 'uploads/owned.geojson', fileType: 'vector', fileSize: geojson.length, mimeType: 'application/geo+json' });
  otherFile = await DataFile.create({ projectId: other.projectId, fileName: 'other.txt', originalName: '不得公開.txt', storagePath: 'uploads/other.txt', fileType: 'document', fileSize: 18 });
  layer = await Layer.create({ region_id: region.region_id, region_code: region.region_code, layer_type: 'road', layer_name: '選定路段', storage_path: 'uploads/owned.geojson' });
  otherLayer = await Layer.create({ region_id: otherRegion.region_id, region_code: region.region_code, layer_type: 'road', layer_name: '其他專案路段', storage_path: 'uploads/other.txt' });
  const { default: app } = await import('../src/app.js');
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}, 20000);

afterAll(async () => {
  if (!enabled) return;
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  if (kept) await fs.writeFile(process.env.PUBLICATION_QA_OUTPUT, JSON.stringify({ root, user: { user_id: user.user_id, username: user.username, role: user.role }, token: signToken(user), parentId: parent.projectId, regionId: region.region_id, shareToken: share.token }), { mode: 0o600 });
  else {
    if (parent) await Project.destroy({ where: { projectId: [parent.projectId, child.projectId, other.projectId] }, force: true });
    if (region) await Region.destroy({ where: { region_id: [region.region_id, otherRegion.region_id] } });
    if (user) await User.destroy({ where: { user_id: user.user_id }, force: true });
    if (root) await fs.rm(root, { recursive: true, force: true });
  }
  await sequelize?.close(); await pool?.end();
  jest.restoreAllMocks();
});

async function json(url, options = {}) { const response = await fetch(base + url, options); return { status: response.status, headers: response.headers, body: await response.json() }; }
async function create(kind, id) { const result = await json(`/api/project-publications/${kind}/${id}/shares`, { method: 'POST', headers: authorization }); expect(result.status).toBe(201); return result.body.data; }
const guest = token => ({ headers: { 'X-Share-Token': token } });

check('legacy private APIs, static assets, and detailed health deny anonymous reads', async () => {
  for (const url of ['/api/projects', '/api/parent-projects', '/api/warning-regions', '/api/health/deep', '/uploads/owned.geojson', '/data/missing.csv']) expect((await fetch(base + url)).status).toBe(401);
  expect((await fetch(base + '/api/health')).status).toBe(200);
});
check('share is scoped to selected parent and children with no credentials or private paths in DTO', async () => {
  share = await create('disaster', parent.projectId);
  const result = await json('/api/shared-project?kind=warning&id=other', guest(share.token));
  expect(result.status).toBe(200); expect(result.body.data.project.id).toBe(parent.projectId);
  expect(result.body.data.children.map(item => item.id)).toEqual([child.projectId]);
  expect(result.body.data.files.map(item => item.id)).toEqual([file.fileId]);
  expect(JSON.stringify(result.body)).not.toMatch(/storage_path|password_hash|token_hash|不得公開|不得出現在/);
  expect(result.headers.get('cache-control')).toContain('no-store');
  expect(await ProjectShare.findByPk(share.id).then(row => row.token_hash)).not.toBe(share.token);
});
check('guest owned attachment succeeds but cross-project attachment and all writes fail', async () => {
  expect((await fetch(`${base}/api/shared-project/assets/files/${file.fileId}`, guest(share.token))).status).toBe(200);
  expect((await fetch(`${base}/api/shared-project/assets/files/${otherFile.fileId}`, guest(share.token))).status).toBe(404);
  expect((await fetch(base + '/api/shared-project', { ...guest(share.token), method: 'POST' })).status).toBe(405);
  expect((await fetch(base + '/api/projects', { headers: { Authorization: `Bearer ${share.token}` } })).status).toBe(401);
});
check('guest assets cannot traverse paths or follow a symlink outside storage roots', async () => {
  await fs.writeFile(path.join(root, 'outside.txt'), 'must-not-be-served');
  await fs.symlink(path.join(root, 'outside.txt'), path.join(process.env.UPLOADS_ROOT, 'escape.txt'));
  const escaped = await DataFile.create({ projectId: parent.projectId, fileName: 'escape.txt', originalName: 'escape.txt', storagePath: 'uploads/escape.txt', fileType: 'document', fileSize: 18 });
  expect((await fetch(`${base}/api/shared-project/assets/files/${escaped.fileId}`, guest(share.token))).status).toBe(404);
  expect((await json('/api/project-assets/sign?path=uploads%2F..%2Foutside.txt', { headers: authorization })).status).toBe(400);
  await escaped.destroy({ force: true }); await fs.unlink(path.join(process.env.UPLOADS_ROOT, 'escape.txt'));
});
check('same-road warning projects cannot read each other layers', async () => {
  const warning = await create('warning', region.region_id);
  const result = await json('/api/shared-project', guest(warning.token));
  expect(result.status).toBe(200); expect(result.body.data.layers.map(item => item.id)).toEqual([layer.layer_id]);
  expect(result.body.data.charts.chart1.dataStatus).toBe('not_configured');
  expect((await fetch(`${base}/api/shared-project/assets/layers/${otherLayer.layer_id}`, guest(warning.token))).status).toBe(404);
});
check('revocation, expiry, and target deletion deny later reads including assets', async () => {
  const revoked = await create('disaster', parent.projectId);
  expect((await json(`/api/project-publications/disaster/${parent.projectId}/shares/${revoked.id}`, { method: 'DELETE', headers: authorization })).status).toBe(200);
  expect((await fetch(base + '/api/shared-project', guest(revoked.token))).status).toBe(404);
  expect((await fetch(`${base}/api/shared-project/assets/files/${file.fileId}`, guest(revoked.token))).status).toBe(404);
  const expired = await create('disaster', parent.projectId);
  await ProjectShare.update({ created_at: new Date(Date.now() - 2000), expires_at: new Date(Date.now() - 1000) }, { where: { share_id: expired.id } });
  expect((await fetch(base + '/api/shared-project', guest(expired.token))).status).toBe(404);
  const deleted = await create('disaster', other.projectId); await other.destroy();
  expect((await fetch(base + '/api/shared-project', guest(deleted.token))).status).toBe(404);
  const deletedRegion = await create('warning', otherRegion.region_id);
  await otherRegion.update({ deleted_at: new Date() });
  expect((await fetch(base + '/api/shared-project', guest(deletedRegion.token))).status).toBe(404);
});
check('native asset cookie and file-bound grant work, but cookie cannot authorize writes', async () => {
  const result = await json('/api/projects', { headers: authorization });
  const cookie = result.headers.get('set-cookie').split(';')[0];
  expect((await fetch(base + '/uploads/owned.geojson', { headers: { Cookie: cookie } })).status).toBe(200);
  expect((await fetch(base + '/api/projects', { method: 'POST', headers: { Cookie: cookie } })).status).toBe(401);
  const signed = await json('/api/project-assets/sign?path=uploads%2Fowned.geojson', { headers: authorization });
  expect(signed.status).toBe(200);
  const grant = encodeURIComponent(signed.body.data.assetToken);
  expect((await fetch(`${base}/uploads/owned.geojson?assetToken=${grant}`)).status).toBe(200);
  expect((await fetch(`${base}/uploads/other.txt?assetToken=${grant}`)).status).toBe(403);
  await user.update({ is_active: false });
  expect((await fetch(`${base}/uploads/owned.geojson?assetToken=${grant}`)).status).toBe(401);
  await user.update({ is_active: true });
});
check('active share links stay revocable after more than fifty links have been issued', async () => {
  const { newShareSecret } = await import('../src/services/publicationPolicy.js');
  const records = Array.from({ length: 51 }, () => ({ share_id: randomUUID(), kind: 'disaster', project_id: parent.projectId,
    token_hash: newShareSecret().hash, created_by: user.user_id, expires_at: new Date(Date.now() + 86400000) }));
  await ProjectShare.bulkCreate(records);
  const result = await json(`/api/project-publications/disaster/${parent.projectId}/shares`, { headers: authorization });
  expect(result.status).toBe(200); expect(result.body.data.map(item => item.id)).toContain(share.id);
});
check('authenticated PDF and Word endpoints return real files and guest cannot export', async () => {
  for (const format of ['pdf', 'docx']) {
    const response = await fetch(`${base}/api/project-publications/disaster/${parent.projectId}/report/${format}`, { headers: authorization });
    expect(response.status).toBe(200); const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, format === 'pdf' ? 5 : 2).toString()).toBe(format === 'pdf' ? '%PDF-' : 'PK');
    if (kept) await fs.writeFile(path.join(root, `project-report.${format}`), bytes);
    expect((await fetch(`${base}/api/project-publications/disaster/${parent.projectId}/report/${format}`, guest(share.token))).status).toBe(401);
  }
}, 20000);
