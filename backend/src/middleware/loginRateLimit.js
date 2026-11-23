import { rateLimit } from 'express-rate-limit';
import { createLogger } from '../utils/logger.js';

const log = createLogger('audit');
const limit = Number(process.env.LOGIN_RATE_LIMIT_MAX || 10);
const windowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1000 || windowMs > 2147483647) {
  throw new Error('Invalid login rate-limit configuration');
}

// shortcut: the in-memory store protects one backend process; use a shared store before adding replicas.
export const loginRateLimit = rateLimit({
  limit, windowMs, standardHeaders: 'draft-8', legacyHeaders: false, skipSuccessfulRequests: true,
  handler(req, res, _next, options) {
    log.warn('Login attempts throttled', { action: 'auth.login', outcome: 'throttled', ip: req.ip });
    res.status(options.statusCode).json({ success: false, message: '登入嘗試過於頻繁，請稍後再試' });
  }
});
