import { parse as parseCookie } from 'cookie';
import { authenticate } from './auth.js';
import { User } from '../models/User.js';
import { credentialVersion } from '../services/authTokenService.js';
import { readAssetGrant } from '../services/publicationPolicy.js';

export const ASSET_COOKIE = 'geoport_asset_session';
export const assetCookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });

export function requireDataAccount(req, res, next) {
  if (['GET', 'HEAD'].includes(req.method) && !req.headers.authorization) {
    const token = parseCookie(req.headers.cookie || '')[ASSET_COOKIE];
    if (token) req.headers.authorization = `Bearer ${token}`;
  }
  authenticate(req, res, () => {
    if (!req.user?.userId) return res.status(401).json({ success: false, message: '請先登入' });
    if (req.authToken && Number.isFinite(req.authExpiresAt)) res.cookie(ASSET_COOKIE, req.authToken, { ...assetCookieOptions(),
      maxAge: Math.max(0, Math.min(600000, req.authExpiresAt - Date.now())) });
    res.setHeader('Cache-Control', 'private, no-store');
    return next();
  });
}

export async function requireStoredAsset(req, res, next) {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    if (req.query.assetToken) {
      const grant = readAssetGrant(req.query.assetToken, process.env.JWT_SECRET);
      const requested = decodeURIComponent((req.originalUrl || req.url).split('?')[0]).replace(/^\/+/, '');
      if (grant.path !== requested) return res.status(403).json({ success: false, message: '附件授權範圍不符' });
      const user = await User.findByPk(grant.userId);
      if (!user?.is_active || credentialVersion(user.password_hash) !== grant.credentialVersion) return res.sendStatus(401);
      req.user = { userId: user.user_id, role: user.role };
      return next();
    }
    const token = parseCookie(req.headers.cookie || '')[ASSET_COOKIE];
    if (!req.headers.authorization && token) req.headers.authorization = `Bearer ${token}`;
    return requireDataAccount(req, res, next);
  } catch (error) {
    return res.status(error.status || 401).json({ success: false, message: '附件存取授權已失效' });
  }
}
