import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const password = 'test-only-admin-secret-7!';
const hash = jest.fn();
const update = jest.fn();
const findOrCreate = jest.fn();
const close = jest.fn();
const define = jest.fn(() => ({ findOrCreate }));
const Sequelize = jest.fn(() => ({ define, close }));
// Block the legacy driver as well: the red run must never reach a real database.
const query = jest.fn();
const end = jest.fn();
const Pool = jest.fn(() => ({ query, end }));

jest.unstable_mockModule('bcryptjs', () => ({ default: { hash } }));
jest.unstable_mockModule('pg', () => ({ default: { Pool } }));
jest.unstable_mockModule('dotenv', () => ({ config: jest.fn() }));
jest.unstable_mockModule('sequelize', () => ({
  Sequelize,
  DataTypes: { UUID: 'UUID', UUIDV4: 'UUIDV4', STRING: 'STRING', BOOLEAN: 'BOOLEAN' }
}));

let originalEnv;
let originalArgv;
let originalExitCode;
let directory;
let log;
let error;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  originalEnv = process.env;
  originalArgv = process.argv;
  originalExitCode = process.exitCode;
  process.env = { NODE_ENV: 'production', DB_PASSWORD: 'test-only-db-secret' };
  process.argv = ['node', 'seed_admin.js'];
  process.exitCode = undefined;
  directory = mkdtempSync(path.join(tmpdir(), 'geoport-admin-test-'));
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
  error = jest.spyOn(console, 'error').mockImplementation(() => {});
  hash.mockReset().mockResolvedValue('test-only-hash');
  findOrCreate.mockReset().mockResolvedValue([{ update }, true]);
  update.mockReset().mockResolvedValue(undefined);
  close.mockReset().mockResolvedValue(undefined);
  query.mockReset().mockResolvedValue({ rows: [{ username: 'admin', role: 'admin' }] });
  end.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  process.env = originalEnv;
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  jest.restoreAllMocks();
  rmSync(directory, { recursive: true, force: true });
});

async function run(args = []) {
  process.argv.push(...args);
  await import('../database/seed_admin.js');
  await new Promise(resolve => setImmediate(resolve));
}

function expectNoSecrets(...secrets) {
  const output = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
  for (const secret of [password, 'test-only-hash', 'test-only-db-secret', ...secrets]) {
    expect(output).not.toContain(secret);
  }
}

function expectRejectedBeforeDatabase() {
  expect(process.exitCode).toBe(1);
  expect(Sequelize).not.toHaveBeenCalled();
  expect(Pool).not.toHaveBeenCalled();
  expect(hash).not.toHaveBeenCalled();
  expectNoSecrets();
}

test.each([[[]], [['--reset']]])('production requires an explicit password: %j', async args => {
  await run(args);
  expectRejectedBeforeDatabase();
});

test.each(['', '   ', 'admin1234', 'password', 'replace-with-strong-password', 'short']) (
  'production rejects empty, default, placeholder or short passwords: %j', async value => {
    process.env.ADMIN_PASSWORD = value;
    await run();
    expectRejectedBeforeDatabase();
  }
);

test.each([
  ['admin', 'admin@geoport.local', password],
  ['--password', password],
  [`--password=${password}`],
  ['-p', password],
  ['--unknown']
].map(args => [args]))('rejects legacy password arguments and unknown options: %j', async args => {
  process.env.ADMIN_PASSWORD = password;
  await run(args);
  expectRejectedBeforeDatabase();
});

test('creates an admin using an environment secret without logging credentials', async () => {
  process.env.ADMIN_PASSWORD = password;
  await run(['operator', 'operator@example.test']);
  expect(hash).toHaveBeenCalledWith(password, 12);
  expect(findOrCreate).toHaveBeenCalledWith({
    where: { username: 'operator' },
    defaults: {
      email: 'operator@example.test', display_name: 'operator',
      password_hash: 'test-only-hash', role: 'admin', is_active: true, is_verified: true
    }
  });
  expect(update).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(1);
  expect(process.exitCode || 0).toBe(0);
  expectNoSecrets();
});

test('reads a secret file and removes only its trailing line ending', async () => {
  const file = path.join(directory, 'admin-secret');
  writeFileSync(file, ` ${password} \r\n`, { mode: 0o600 });
  process.env.ADMIN_PASSWORD_FILE = file;
  await run();
  expect(hash).toHaveBeenCalledWith(` ${password} `, 12);
  expect(close).toHaveBeenCalledTimes(1);
  expectNoSecrets();
});

test.each(['missing', 'empty', 'both'])('rejects invalid secret file configuration: %s', async mode => {
  const file = path.join(directory, 'admin-secret');
  process.env.ADMIN_PASSWORD_FILE = file;
  if (mode !== 'missing') writeFileSync(file, '\n', { mode: 0o600 });
  if (mode === 'both') process.env.ADMIN_PASSWORD = password;
  await run();
  expectRejectedBeforeDatabase();
});

test('does not silently truncate passwords beyond the bcrypt byte limit', async () => {
  process.env.ADMIN_PASSWORD = 'x'.repeat(73);
  await run();
  expectRejectedBeforeDatabase();
});

test('enforces the bcrypt limit by UTF-8 bytes, not character count', async () => {
  process.env.ADMIN_PASSWORD = '\u4e2d'.repeat(25);
  await run();
  expectRejectedBeforeDatabase();
});

test('hashing failures exit nonzero without opening the database or logging secrets', async () => {
  process.env.ADMIN_PASSWORD = password;
  hash.mockRejectedValue(new Error(password));
  await run();
  expect(process.exitCode).toBe(1);
  expect(Sequelize).not.toHaveBeenCalled();
  expectNoSecrets();
});

test('uses the users model without schema synchronization and verifies TLS certificates', async () => {
  process.env.ADMIN_PASSWORD = password;
  process.env.DB_SSL = 'true';
  await run();
  expect(Sequelize).toHaveBeenCalledWith(expect.objectContaining({
    logging: false, dialectOptions: { ssl: { rejectUnauthorized: true } }
  }));
  expect(define).toHaveBeenCalledWith('SeedAdmin', expect.objectContaining({
    user_id: expect.objectContaining({ primaryKey: true }),
    username: expect.objectContaining({ unique: true })
  }), { tableName: 'users', timestamps: false });
});

test('skips an existing admin without changing its password', async () => {
  process.env.ADMIN_PASSWORD = password;
  findOrCreate.mockResolvedValue([{ update }, false]);
  await run();
  expect(update).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(1);
  expectNoSecrets();
});

test('resets an existing admin only with --reset', async () => {
  process.env.ADMIN_PASSWORD = password;
  findOrCreate.mockResolvedValue([{ update }, false]);
  await run(['--reset']);
  expect(update).toHaveBeenCalledWith({ password_hash: 'test-only-hash', role: 'admin', is_active: true });
  expect(close).toHaveBeenCalledTimes(1);
  expectNoSecrets();
});

test.each(['development', 'test'])('local %s works with an explicit secret, never a fallback', async mode => {
  process.env.NODE_ENV = mode;
  process.env.ADMIN_PASSWORD = password;
  await run();
  expect(hash).toHaveBeenCalledWith(password, 12);
  expect(Sequelize).toHaveBeenCalledWith(expect.objectContaining({
    database: mode === 'test' ? 'geoport_test' : 'geoport_db'
  }));
  expect(process.exitCode || 0).toBe(0);
  expectNoSecrets();
});

test.each([
  { name: 'default test database', env: { DB_NAME: 'primary_db' }, expected: 'geoport_test' },
  { name: 'explicit test database', env: { DB_NAME: 'primary_db', DB_NAME_TEST: 'isolated_test_db' }, expected: 'isolated_test_db' },
  { name: 'empty test name fallback', env: { DB_NAME: 'primary_db', DB_NAME_TEST: '' }, expected: 'geoport_test' }
].flatMap(row => [false, true].map(reset => ({ ...row, reset }))))(
  'test mode selects $name (reset=$reset)', async ({ env, expected, reset }) => {
    Object.assign(process.env, env, { NODE_ENV: 'test', ADMIN_PASSWORD: password });
    await run(reset ? ['--reset'] : []);
    expect(Sequelize).toHaveBeenCalledWith(expect.objectContaining({ database: expected }));
    expect(process.exitCode || 0).toBe(0);
    expectNoSecrets();
  }
);

test.each([
  { name: 'explicit collision', env: { DB_NAME: 'shared_db', DB_NAME_TEST: 'shared_db' } },
  { name: 'primary fallback collision', env: { DB_NAME_TEST: 'geoport_db' } },
  { name: 'test fallback collision', env: { DB_NAME: 'geoport_test' } }
].flatMap(row => [false, true].map(reset => ({ ...row, reset }))))(
  'test mode rejects $name before connecting (reset=$reset)', async ({ env, reset }) => {
    Object.assign(process.env, env, { NODE_ENV: 'test', ADMIN_PASSWORD: password });
    await run(reset ? ['--reset'] : []);
    expectRejectedBeforeDatabase();
    expect(findOrCreate).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  }
);

test.each(['development', 'production'])(
  '%s uses DB_NAME rather than DB_NAME_TEST', async mode => {
    Object.assign(process.env, {
      NODE_ENV: mode, ADMIN_PASSWORD: password,
      DB_NAME: 'primary_db', DB_NAME_TEST: 'isolated_test_db'
    });
    await run();
    expect(Sequelize).toHaveBeenCalledWith(expect.objectContaining({ database: 'primary_db' }));
    expect(process.exitCode || 0).toBe(0);
    expectNoSecrets();
  }
);

test('local use without a password fails before opening the database', async () => {
  process.env.NODE_ENV = 'development';
  await run();
  expectRejectedBeforeDatabase();
});

test.each(['database', 'reset', 'close'])('fails nonzero without leaking %s errors', async stage => {
  process.env.ADMIN_PASSWORD = password;
  const failure = new Error(`${password} test-only-hash test-only-db-secret`);
  if (stage === 'database') findOrCreate.mockRejectedValue(failure);
  if (stage === 'reset') {
    findOrCreate.mockResolvedValue([{ update }, false]);
    update.mockRejectedValue(failure);
  }
  if (stage === 'close') close.mockRejectedValue(failure);
  query.mockRejectedValue(failure);
  await run(['--reset']);
  expect(process.exitCode).toBe(1);
  expect(close).toHaveBeenCalledTimes(1);
  expectNoSecrets();
});
