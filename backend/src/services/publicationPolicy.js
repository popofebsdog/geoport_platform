import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isValidUUID } from '../utils/validators.js';

export const publicationError = (status, message) => Object.assign(new Error(message), { status });

export function validatePublicationTarget(kind, id) {
  if (!['disaster', 'warning'].includes(kind) || !isValidUUID(id)) {
    throw publicationError(400, '無效的專案');
  }
  return { kind, id };
}

export function hashShareSecret(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw publicationError(404, '分享連結已失效或不存在');
  }
  return createHash('sha256').update(token).digest('hex');
}

export function newShareSecret() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashShareSecret(token) };
}

export function isShareActive(share, now = new Date()) {
  return Boolean(share && !share.revoked_at && new Date(share.expires_at).getTime() > now.getTime());
}

const assetSignature = (payload, secret) => createHmac('sha256', secret).update(`geoport-asset-v1:${payload}`).digest('base64url');

export function signAssetGrant(identity, secret, now = new Date()) {
  const payload = Buffer.from(JSON.stringify({ ...identity, expires: now.getTime() + 300000 })).toString('base64url');
  return `${payload}.${assetSignature(payload, secret)}`;
}

export function readAssetGrant(value, secret, now = new Date()) {
  const denied = () => publicationError(401, '附件存取授權已失效');
  if (!secret || typeof value !== 'string' || value.length > 4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value)) throw denied();
  const [payload, signature] = value.split('.');
  const expected = assetSignature(payload, secret);
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw denied();
  let identity;
  try { identity = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { throw denied(); }
  if (!(identity.expires > now.getTime()) || identity.expires > now.getTime() + 300000 ||
      typeof identity.path !== 'string' || !/^(uploads|data)\//.test(identity.path) || identity.path.split('/').includes('..')) throw denied();
  return identity;
}
