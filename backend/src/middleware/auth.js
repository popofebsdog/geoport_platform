import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify JWT token from Authorization header.
 * Skip enforcement when JWT_SECRET is not configured (dev mode without auth).
 */
export function authenticate(req, res, next) {
  if (!JWT_SECRET) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供認證令牌' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: '認證令牌無效或已過期' });
  }
}
