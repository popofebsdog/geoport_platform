import { test, expect, beforeAll, afterAll } from '@jest/globals';
import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const socket = process.env.GEOPORT_TEST_PG_SOCKET;
const integration = socket ? test : test.skip;
const root = fileURLToPath(new URL('../', import.meta.url));
const name = `geoport_workflows_${process.pid}`;
const originalEnv = process.env;
let admin, directory, server, database, base;
let User;
const tokens = {};

beforeAll(async () => {
  if (!socket) return;
  directory = await mkdtemp(path.join(tmpdir(), 'geoport-review-workflows-'));
  await mkdir(path.join(directory, 'uploads'));
  await mkdir(path.join(directory, 'data'));
  const env = { ...originalEnv, DB_HOST: socket, DB_PORT: '55439', DB_USER: 'geoport_audit',
    DB_PASSWORD: 'test-only-unused-password', DB_NAME: name, LC_ALL: 'C' };
  const deploy = spawnSync('bash', [path.join(root, 'database/deploy.sh')], { env, encoding: 'utf8', timeout: 60000 });
  expect(deploy.status).toBe(0);
  process.env = { ...env, NODE_ENV: 'test', DB_NAME: 'unused_development_guard', DB_NAME_TEST: name,
    JWT_SECRET: 'review-workflow-test-secret', LOG_LEVEL: 'silent',
    UPLOADS_ROOT: path.join(directory, 'uploads'), DATA_ROOT: path.join(directory, 'data') };
  const { default: app } = await import('../src/app.js');
  database = await import('../src/config/database.js');
  ({ User } = await import('../src/models/User.js'));
  const { signToken } = await import('../src/services/authTokenService.js');
  for (const role of ['admin', 'editor', 'viewer']) {
    const user = await User.create({ username: `fixture_${role}`, email: `${role}@example.org`, display_name: `Fixture ${role}`,
      role, is_active: true, is_verified: true, password_hash: await bcrypt.hash('fixture-login-password', 4) });
    tokens[role] = signToken(user);
  }
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
}, 60000);

afterAll(async () => {
  if (!socket) return;
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  if (database) { await database.sequelize.close(); await database.pool.end(); }
  admin = new Sequelize('postgres', 'geoport_audit', 'test-only-unused-password', {
    dialect: 'postgres', host: socket, port: 55439, logging: false
  });
  try { await admin.getQueryInterface().dropDatabase(name); } finally { await admin.close(); }
  if (directory) await rm(directory, { recursive: true, force: true });
  process.env = originalEnv;
});

async function request(method, route, data, role = 'admin') {
  const token = tokens[role] || role;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (data && !(data instanceof FormData)) headers['Content-Type'] = 'application/json';
  const result = await fetch(`${base}${route}`, { method, headers,
    body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(15000) });
  return { status: result.status, body: await result.json() };
}

integration('projects, canonical reports, CSV lifecycle and viewer authorization work over real HTTP and PostgreSQL', async () => {
  const location = { type: 'Point', coordinates: [121.4, 24.6] };
  const parent = await request('POST', '/parent-projects', { name: 'Workflow place', locationGeometry: location, road_type: 'highway' });
  expect(parent.status).toBe(201);
  const parentId = parent.body.data.project_id;
  const child = await request('POST', `/parent-projects/${parentId}/children`, {
    name: 'Workflow survey', event_date: '2026-11-22', locationGeometry: location
  });
  expect(child.status).toBe(201);
  const childId = child.body.data.project_id;
  expect((await request('GET', `/parent-projects/${parentId}/children`)).body.data.children).toHaveLength(1);
  expect((await request('PATCH', `/projects/${childId}/bookmark`)).status).toBe(200);
  expect((await request('GET', `/parent-projects/${parentId}/children`)).body.data.children[0].is_bookmarked).toBe(true);
  expect((await request('PUT', `/child-projects/${childId}`, { name: 'Updated survey' })).status).toBe(200);
  const report = await request('POST', `/parent-projects/${parentId}/report-links`, { title: 'Report', url: 'https://example.org/report' });
  expect(report.status).toBe(201);
  const linkId = report.body.data.id;
  expect((await request('PUT', `/parent-projects/${parentId}/report-links/${linkId}`, { title: 'Updated report', url: 'https://example.org/current' })).status).toBe(200);
  const list = await request('GET', '/parent-projects');
  expect(list.body.data[0].metadata.reportLinks[0].title).toBe('Updated report');
  const csv = new FormData();
  for (const [key, value] of Object.entries({ name: 'Measurements', longitude: '121.4', latitude: '24.6',
    xAxisColumns: '["time"]', yAxisColumns: '["value"]' })) csv.set(key, value);
  csv.set('file', new Blob(['time,value\n2026-11-22T00:00:00,0\n2026-11-22T00:01:00,2\n'], { type: 'text/csv' }), 'measurements.csv');
  const uploaded = await request('POST', `/temporal-data-enhanced/${childId}/upload`, csv, 'editor');
  expect(uploaded.status).toBe(200);
  expect(uploaded.body.success).toBe(true);
  const temporalId = uploaded.body.data.temporalId;
  const chart = await request('GET', `/temporal-data-enhanced/${temporalId}/chart`, undefined, 'viewer');
  expect(chart.body.data.chartData.datasets[0].data.map(point => point.y)).toEqual([0, 2]);
  const files = await request('GET', '/admin/files');
  expect(files.body.files[0].processing_status).toBe('completed');
  for (const [method, route, data] of [
    ['POST', '/parent-projects', { name: 'Forbidden', locationGeometry: location }],
    ['PUT', `/child-projects/${childId}`, { name: 'Forbidden' }],
    ['DELETE', `/child-projects/${childId}`]
  ]) expect((await request(method, route, data, 'viewer')).status).toBe(403);
  expect((await request('GET', '/admin/overview', undefined, 'viewer')).status).toBe(403);
  expect((await request('DELETE', `/temporal-data-enhanced/${randomUUID()}`)).status).toBe(404);
  expect((await request('DELETE', `/temporal-data-enhanced/${temporalId}`)).status).toBe(200);
  expect((await request('GET', `/temporal-data-enhanced/${childId}/list`)).body.data).toHaveLength(0);
  expect((await request('DELETE', `/parent-projects/${parentId}/report-links/${linkId}`)).status).toBe(200);
  expect((await request('DELETE', `/child-projects/${childId}`)).status).toBe(200);
  expect((await request('DELETE', `/parent-projects/${parentId}`)).status).toBe(200);
}, 60000);

integration('only admins create accounts and current account state revokes old privileges over HTTP', async () => {
  const credentials = { username: 'managed_user', email: 'managed@example.org', display_name: 'Managed user', password: 'managed-login-password', role: 'editor' };
  expect((await request('POST', '/auth/register', credentials, null)).status).toBe(404);
  expect((await request('POST', '/auth/users', credentials, null)).status).toBe(401);
  for (const role of ['viewer', 'editor']) expect((await request('POST', '/auth/users', credentials, role)).status).toBe(403);
  const created = await request('POST', '/auth/users', credentials);
  expect(created.status).toBe(201);
  expect(created.body.user.password_hash).toBeUndefined();
  expect(created.body.token).toBeUndefined();
  const id = created.body.user.user_id;
  const login = () => request('POST', '/auth/login', { username: credentials.username, password: credentials.password }, null);
  const signedIn = await login();
  expect(signedIn.status).toBe(200);
  const token = signedIn.body.token;
  const canRead = () => request('GET', '/auth/profile', undefined, token);
  expect((await canRead()).status).toBe(200);
  expect((await request('PUT', `/auth/users/${id}`, { role: 'viewer' })).status).toBe(200);
  expect((await request('POST', '/parent-projects', { name: 'Forbidden' }, token)).status).toBe(403);
  expect((await request('GET', '/auth/users', undefined, token)).status).toBe(403);
  expect((await canRead()).body.user.role).toBe('viewer');
  expect((await request('PUT', `/auth/users/${id}`, { is_active: false })).status).toBe(200);
  expect((await canRead()).status).toBe(401);
  expect((await login()).status).toBe(403);
  expect((await request('PUT', `/auth/users/${id}`, { is_active: true, password: 'managed-new-password' })).status).toBe(200);
  expect((await canRead()).status).toBe(401);
  expect((await login()).status).toBe(401);
  credentials.password = 'managed-new-password';
  const refreshed = await login();
  expect(refreshed.status).toBe(200);
  await User.destroy({ where: { user_id: id } });
  expect((await request('GET', '/auth/profile', undefined, refreshed.body.token)).status).toBe(401);
  expect((await request('GET', '/data-files/not-a-uuid', undefined, null)).status).toBe(401);
  expect((await request('GET', '/data-files/not-a-uuid')).status).toBe(400);
}, 30000);
