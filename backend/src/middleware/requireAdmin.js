import { createLogger } from '../utils/logger.js';
const audit = createLogger('audit');

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    audit.warn('Admin access denied', { action: 'auth.admin_access', outcome: 'denied' });
    return res.status(403).json({ success: false, message: '僅限管理員存取' });
  }
  next();
}
