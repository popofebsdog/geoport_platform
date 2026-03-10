import rateLimit from 'express-rate-limit';

// Security: Global API rate limiter — tune thresholds per deployment
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '請求頻率過高，請稍後再試',
  },
});

// Security: Strict auth rate limiter — prevents brute-force attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '登入嘗試過多，請 15 分鐘後再試',
  },
});
