import crypto from 'node:crypto';
import { createLogger } from '../utils/logger.js';

const log = createLogger('http');

function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
}

export function requestLogger() {
  return (req, res, next) => {
    if (process.env.LOG_REQUESTS === 'false') {
      return next();
    }

    const startedAt = process.hrtime.bigint();
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const event = {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(1)),
        contentLength: res.getHeader('content-length') || 0,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent']
      };

      if (res.statusCode >= 500) {
        log.error('request completed', event);
      } else if (res.statusCode >= 400) {
        log.warn('request completed', event);
      } else {
        log.info('request completed', event);
      }
    });

    next();
  };
}
