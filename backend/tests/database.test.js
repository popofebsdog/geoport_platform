import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const Sequelize = jest.fn();
const Pool = jest.fn();
const dotenvConfig = jest.fn();

jest.unstable_mockModule('sequelize', () => ({ Sequelize }));
jest.unstable_mockModule('pg', () => ({ default: { Pool } }));
jest.unstable_mockModule('dotenv', () => ({ default: { config: dotenvConfig } }));

const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  for (const key of ['NODE_ENV', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_NAME_TEST', 'DB_USER', 'DB_PASSWORD', 'DB_SSL']) {
    delete process.env[key];
  }
});

afterEach(() => {
  process.env = originalEnv;
});

const loadDatabase = () => import('../src/config/database.js');

const expectSharedConfig = (database, ssl) => {
  expect(Sequelize).toHaveBeenCalledTimes(1);
  expect(Pool).toHaveBeenCalledTimes(1);
  const sequelizeConfig = Sequelize.mock.calls[0][0];
  const poolConfig = Pool.mock.calls[0][0];
  expect(sequelizeConfig.database).toBe(database);
  expect(poolConfig).toMatchObject({
    database,
    host: sequelizeConfig.host,
    port: Number(sequelizeConfig.port),
    user: sequelizeConfig.username,
    password: sequelizeConfig.password,
    ssl
  });
  expect(sequelizeConfig).toMatchObject({ dialectOptions: { ssl } });
};

describe('environment-selected database configuration', () => {
  test.each(['development', 'test', 'production'])('%s shares its database and SSL between clients', async env => {
    Object.assign(process.env, {
      NODE_ENV: env,
      DB_HOST: 'database.example.invalid',
      DB_PORT: '5433',
      DB_NAME: 'main_database',
      DB_NAME_TEST: 'isolated_test_database',
      DB_USER: 'database_user',
      DB_PASSWORD: 'test-only-strong-password',
      DB_SSL: 'true'
    });

    await loadDatabase();

    expectSharedConfig(env === 'test' ? 'isolated_test_database' : 'main_database', {
      require: true,
      rejectUnauthorized: true
    });
  });

  test.each(['development', 'test', 'production'])('%s disables SSL unless explicitly enabled', async env => {
    Object.assign(process.env, {
      NODE_ENV: env,
      DB_HOST: 'database.example.invalid',
      DB_NAME: 'main_database',
      DB_USER: 'database_user',
      DB_PASSWORD: 'test-only-strong-password',
      DB_SSL: 'false'
    });

    await loadDatabase();

    expectSharedConfig(env === 'test' ? 'geoport_test' : 'main_database', false);
  });

  test('defaults to development without enabling SSL', async () => {
    await loadDatabase();

    expectSharedConfig('geoport_db', false);
  });

  test.each([undefined, ''])('test uses its isolated default when DB_NAME_TEST is %s', async testName => {
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = 'main_database';
    if (testName !== undefined) process.env.DB_NAME_TEST = testName;

    await loadDatabase();

    expectSharedConfig('geoport_test', false);
  });

  test.each([
    { DB_NAME: 'main_database', DB_NAME_TEST: 'main_database' },
    { DB_NAME_TEST: 'geoport_db' },
    { DB_NAME: 'geoport_test' }
  ])('rejects test database collisions before constructing either client: %j', async names => {
    Object.assign(process.env, { NODE_ENV: 'test', ...names });

    await expect(loadDatabase()).rejects.toThrow(/DB_NAME_TEST/);

    expect(Sequelize).not.toHaveBeenCalled();
    expect(Pool).not.toHaveBeenCalled();
  });
});
