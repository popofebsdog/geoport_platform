import { jest, beforeEach, test, expect, afterAll } from '@jest/globals';
import bcrypt from 'bcryptjs';
import express from 'express';

process.env.JWT_SECRET = 'isolated-account-policy-secret';
process.env.ALLOW_PUBLIC_REGISTRATION = 'true';
process.env.LOGIN_RATE_LIMIT_MAX = '2';
process.env.LOG_FORMAT = 'json';
process.env.LOG_LEVEL = 'silent';
const id = '11111111-1111-4111-8111-111111111111';
let current;
const User = { findOne: jest.fn(), findByPk: jest.fn(), findAll: jest.fn(), create: jest.fn(), update: jest.fn() };
const query = jest.fn();
jest.unstable_mockModule('../src/config/database.js', () => ({ pool: { query }, sequelize: { define: () => User } }));
const { authenticate } = await import('../src/middleware/auth.js');
const { login, createUserByAdmin } = await import('../src/controllers/authController.js');
const { default: routes } = await import('../src/routes/auth.js');
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const password_hash = await bcrypt.hash('account-fixture-password', 4);
const servers = [];

beforeEach(() => {
  jest.clearAllMocks();
  current = { user_id: id, username: 'fixture', email: 'fixture@example.org', role: 'admin',
    password_hash, is_active: true, update: jest.fn().mockResolvedValue(undefined) };
  User.findOne.mockImplementation(async () => current);
  User.findByPk.mockImplementation(async () => current);
  User.create.mockImplementation(async data => ({ ...data, user_id: id }));
  query.mockImplementation(async () => ({ rows: current ? [current] : [] }));
});

afterAll(async () => {
  for (const server of servers) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
});

async function token() {
  const res = response();
  await login({ body: { username: 'fixture', password: 'account-fixture-password' } }, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  return res.json.mock.calls[0][0].token;
}

test.each(['disabled', 'deleted', 'password reset'])('%s accounts cannot reuse old login credentials', async change => {
  const value = await token();
  if (change === 'disabled') current.is_active = false;
  if (change === 'deleted') current = null;
  if (change === 'password reset') current.password_hash = 'changed-password-hash';
  const next = jest.fn(), res = response();
  await authenticate({ method: 'POST', headers: { authorization: `Bearer ${value}` } }, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('a demoted administrator immediately loses write and account-management privileges', async () => {
  const value = await token();
  current.role = 'viewer';
  const next = jest.fn(), res = response();
  await authenticate({ method: 'POST', headers: { authorization: `Bearer ${value}` } }, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});

test('authentication uses the current database role on read requests', async () => {
  const value = await token();
  current.role = 'editor';
  const req = { method: 'GET', headers: { authorization: `Bearer ${value}` } };
  const next = jest.fn();
  await authenticate(req, response(), next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(req.user.role).toBe('editor');
  expect(req.user.password_hash).toBeUndefined();
});

test('existing passwords longer than 72 bytes can still log in', async () => {
  const password = 'legacy-password-'.repeat(6);
  current.password_hash = await bcrypt.hash(password, 4);
  const res = response();
  await login({ body: { username: 'fixture', password } }, res);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test('account creation requires an authenticated highest-role administrator', async () => {
  for (const user of [undefined, { role: 'viewer' }, { role: 'editor' }]) {
    const res = response();
    await createUserByAdmin({ user, body: { username: 'newuser', email: 'new@example.org', password: 'fixture-password' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  }
  expect(User.create).not.toHaveBeenCalled();
});

test('registration is removed even when an old environment setting enables it', async () => {
  const app = express();
  app.use(express.json(), routes);
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise(resolve => server.once('listening', resolve));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/register`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'newuser', email: 'new@example.org', password: 'fixture-password' }) });
  expect(res.status).toBe(404);
  expect(User.create).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
});

test('repeated failed logins are throttled with a retry interval', async () => {
  current = null;
  const app = express();
  app.use(express.json(), routes);
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise(resolve => server.once('listening', resolve));
  const attempt = () => fetch(`http://127.0.0.1:${server.address().port}/login`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'unknown', password: 'bad-password' }) });
  expect((await attempt()).status).toBe(401);
  expect((await attempt()).status).toBe(401);
  const rejected = await attempt();
  expect(rejected.status).toBe(429);
  expect(Number(rejected.headers.get('retry-after'))).toBeGreaterThan(0);
});

test('login outcomes emit audit records without the supplied password or token', async () => {
  let output = '';
  process.env.LOG_LEVEL = 'info';
  const capture = jest.spyOn(process.stdout, 'write').mockImplementation(value => { output += value; return true; });
  const captureErrors = jest.spyOn(process.stderr, 'write').mockImplementation(value => { output += value; return true; });
  try {
    await token();
    current = null;
    await login({ body: { username: 'unknown', password: 'never-log-this-password' } }, response());
  } finally { capture.mockRestore(); captureErrors.mockRestore(); process.env.LOG_LEVEL = 'silent'; }
  const events = output.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  expect(events).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'auth.login', outcome: 'success', targetUserId: id }),
    expect.objectContaining({ action: 'auth.login', outcome: 'denied' })
  ]));
  expect(output).not.toContain('never-log-this-password');
  expect(output).not.toContain('credentialVersion');
});
