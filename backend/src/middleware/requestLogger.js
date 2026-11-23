import crypto from 'node:crypto';
import { createLogger, withRequestLogContext } from '../utils/logger.js';

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
    const suppliedId = req.headers['x-request-id'];
    const requestId = typeof suppliedId === 'string' && /^[A-Za-z0-9._:-]{1,64}$/.test(suppliedId)
      ? suppliedId : crypto.randomUUID();
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    let logged = false;
    const complete = aborted => {
      if (logged) return;
      logged = true;
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const event = {
        requestId,
        userId: req.user?.userId || null,
        role: req.user?.role || null,
        method: req.method,
        path: (req.originalUrl || req.url).split(/[?#]/, 1)[0],
        statusCode: aborted ? 499 : res.statusCode,
        aborted,
        durationMs: Number(durationMs.toFixed(1)),
        contentLength: res.getHeader('content-length') || 0,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent']
      };

      if (aborted) {
        log.warn('request aborted', event);
      } else if (res.statusCode >= 500) {
        log.error('request completed', event);
      } else if (res.statusCode >= 400) {
        log.warn('request completed', event);
      } else {
        log.info('request completed', event);
      }
    };
    res.on('finish', () => complete(false));
    res.on('close', () => complete(!res.writableFinished));

    return withRequestLogContext(req, next);
  };
}
