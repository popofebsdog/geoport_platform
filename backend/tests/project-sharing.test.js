import { test, expect } from '@jest/globals';

const policy = await import('../src/services/publicationPolicy.js').catch(() => ({}));

test('sharing has an explicit capability policy independent of account JWTs', () => {
  expect(typeof policy.newShareSecret).toBe('function');
  expect(typeof policy.hashShareSecret).toBe('function');
  expect(typeof policy.validatePublicationTarget).toBe('function');
});

test('share secrets are random, URL-safe, and stored only as SHA256 hashes', () => {
  expect(typeof policy.newShareSecret).toBe('function');
  const first = policy.newShareSecret(), second = policy.newShareSecret();
  expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(first.hash).toBe(policy.hashShareSecret(first.token));
  expect(first.token).not.toBe(second.token);
  expect(first.hash).not.toContain(first.token);
});

test('malformed capabilities and non-project targets cannot reach a query', () => {
  expect(typeof policy.hashShareSecret).toBe('function');
  for (const value of [undefined, '', '../secret', 'x'.repeat(5000), 'Bearer fixture']) {
    expect(() => policy.hashShareSecret(value)).toThrow();
  }
  const id = '11111111-1111-4111-8111-111111111111';
  expect(policy.validatePublicationTarget('disaster', id)).toEqual({ kind: 'disaster', id });
  expect(policy.validatePublicationTarget('warning', id)).toEqual({ kind: 'warning', id });
  expect(() => policy.validatePublicationTarget('users', id)).toThrow();
  expect(() => policy.validatePublicationTarget('warning', '../other')).toThrow();
});

test('expiry and revocation are evaluated for every read with no clock-boundary allowance', () => {
  expect(typeof policy.isShareActive).toBe('function');
  const now = new Date('2026-11-23T00:00:00Z');
  expect(policy.isShareActive({ expires_at: '2026-11-24T00:00:00Z', revoked_at: null }, now)).toBe(true);
  expect(policy.isShareActive({ expires_at: now, revoked_at: null }, now)).toBe(false);
  expect(policy.isShareActive({ expires_at: 'invalid', revoked_at: null }, now)).toBe(false);
  expect(policy.isShareActive({ expires_at: '2026-11-24T00:00:00Z', revoked_at: now }, now)).toBe(false);
});

test('short-lived raster asset grants are path-bound and cannot become account JWTs', () => {
  expect(typeof policy.signAssetGrant).toBe('function');
  const now = new Date('2026-11-23T00:00:00Z');
  const grant = policy.signAssetGrant({ path: 'uploads/fixture/map.tif', userId: 'fixture-user', credentialVersion: 'fixture-version' }, 'fixture-secret', now);
  expect(grant.split('.')).toHaveLength(2);
  expect(policy.readAssetGrant(grant, 'fixture-secret', now).path).toBe('uploads/fixture/map.tif');
  expect(() => policy.readAssetGrant(grant, 'different-secret', now)).toThrow();
  expect(() => policy.readAssetGrant(`${grant}bad`, 'fixture-secret', now)).toThrow();
  expect(() => policy.readAssetGrant(grant, 'fixture-secret', new Date(now.getTime() + 300001))).toThrow();
});
