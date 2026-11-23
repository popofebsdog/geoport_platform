import { test, expect, afterAll } from '@jest/globals';

process.env.TRUST_PROXY = '1';
process.env.LOG_LEVEL = 'silent';
const { default: app } = await import('../src/app.js');
const { sequelize, pool } = await import('../src/config/database.js');
const { parseTrustProxy } = await import('../src/config/trustProxy.js');
afterAll(async () => { await sequelize.close(); await pool.end(); });

test('the configured proxy hop count is a number, not an IP string', () => {
  expect(app.get('trust proxy')).toBe(1);
  expect(app.get('trust proxy fn')('172.18.0.3', 0)).toBe(true);
  expect(app.get('trust proxy fn')('172.18.0.3', 1)).toBe(false);
});

test('direct connections, explicit subnets and unsafe proxy values are handled deliberately', () => {
  expect(parseTrustProxy('false')).toBe(false);
  expect(parseTrustProxy('0')).toBe(0);
  expect(parseTrustProxy('2')).toBe(2);
  expect(parseTrustProxy('loopback,10.0.0.0/8')).toEqual(['loopback','10.0.0.0/8']);
  expect(() => parseTrustProxy('true')).toThrow();
  expect(() => parseTrustProxy('-1')).toThrow();
});
