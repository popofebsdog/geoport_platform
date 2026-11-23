import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { credentialVersion } from '../services/authTokenService.js';
import { isValidUUID } from '../utils/validators.js';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify JWT token from Authorization header.
 * Skip enforcement when JWT_SECRET is not configured (dev mode without auth).
 */
export async function authenticate(req, res, next) {
  if (req.authenticated === true) return next();
  if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ success: false, message: '伺服器設定錯誤' });
    }
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供認證令牌' });
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({ success: false, message: '認證令牌無效或已過期' });
  }
  if (!isValidUUID(payload.userId) || typeof payload.credentialVersion !== 'string') {
    return res.status(401).json({ success: false, message: '請重新登入' });
  }
  try {
    const user = await User.findByPk(payload.userId);
    if (!user?.is_active || payload.credentialVersion !== credentialVersion(user.password_hash)) {
      return res.status(401).json({ success: false, message: '帳號已停用或登入憑證已失效，請重新登入' });
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !['admin', 'editor'].includes(user.role)) {
      return res.status(403).json({ success: false, message: '瀏覽者僅能檢視資料，無法修改' });
    }
    req.user = { userId: user.user_id, username: user.username, role: user.role };
    req.authenticated = true;
    req.authToken = token;
    req.authExpiresAt = Number(payload.exp) * 1000;
    req.authCredentialVersion = payload.credentialVersion;
  } catch (error) {
    console.error('Account authentication failed:', error);
    return res.status(503).json({ success: false, message: '暫時無法驗證帳號，請稍後重試' });
  }
  return next();
}
