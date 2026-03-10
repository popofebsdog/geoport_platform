import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

import app from '../app.js';
import { pool, sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { apiLimiter, authLimiter } from '../middleware/rateLimiter.js';
import { auditLogger } from '../middleware/auditLogger.js';

const createMockRes = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('Middleware tests', () => {
  beforeAll(() => {
    jest.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
    jest.spyOn(pool, 'query').mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('auth.js authenticate middleware', () => {
    test('skips auth when JWT_SECRET is not configured', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      jest.resetModules();

      const { authenticate: authenticateWithoutSecret } = await import(`../middleware/auth.js?ts=${Date.now()}`);
      const req = { headers: {} };
      const res = createMockRes();
      const next = jest.fn();

      authenticateWithoutSecret(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();

      process.env.JWT_SECRET = originalSecret;
      jest.resetModules();
    });

    test('rejects missing Authorization header', () => {
      const req = { headers: {} };
      const res = createMockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '未提供認證令牌',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('rejects invalid token', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '認證令牌無效或已過期',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('rejects expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 1, username: 'test', role: 'admin' },
        'test-secret-key',
        { expiresIn: '-1s' }
      );
      const req = {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '認證令牌無效或已過期',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('passes valid token and sets req.user', () => {
      const validToken = jwt.sign(
        { userId: 1, username: 'test', role: 'admin' },
        'test-secret-key'
      );
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toMatchObject({ userId: 1, username: 'test', role: 'admin' });
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('errorHandler.js middleware', () => {
    test('handles SequelizeValidationError with 400 response', () => {
      const err = {
        name: 'SequelizeValidationError',
        message: 'Validation failed',
        errors: [{ path: 'username', message: 'username is required' }],
      };
      const req = {};
      const res = createMockRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '數據驗證失敗',
        errors: [{ field: 'username', message: 'username is required' }],
      });
    });

    test('handles SequelizeUniqueConstraintError with 400 response', () => {
      const err = {
        name: 'SequelizeUniqueConstraintError',
        message: 'Duplicate value',
      };
      const req = {};
      const res = createMockRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '數據已存在',
      });
    });

    test('handles JsonWebTokenError with 401 response', () => {
      const err = {
        name: 'JsonWebTokenError',
        message: 'invalid token',
      };
      const req = {};
      const res = createMockRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '無效的令牌',
      });
    });

    test('handles TokenExpiredError with 401 response', () => {
      const err = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
      };
      const req = {};
      const res = createMockRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '令牌已過期',
      });
    });

    test('handles generic error with 500 and sanitized production message', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      jest.resetModules();

      const { errorHandler: productionErrorHandler } = await import(`../middleware/errorHandler.js?ts=${Date.now()}`);
      const err = {
        name: 'Error',
        message: 'sensitive internal failure',
        stack: 'stack trace should not be exposed',
      };
      const req = {};
      const res = createMockRes();
      const next = jest.fn();

      productionErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '服務器內部錯誤',
      });

      process.env.NODE_ENV = originalNodeEnv;
      jest.resetModules();
    });
  });

  describe('notFound.js middleware', () => {
    test('returns 404 for unknown route with error message', async () => {
      const response = await request(app).get('/api/does-not-exist');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('找不到');
      expect(response.body.message).toContain('/api/does-not-exist');
    });
  });

  describe('rateLimiter.js middleware exports', () => {
    test('imports succeed and apiLimiter/authLimiter are functions', () => {
      expect(typeof apiLimiter).toBe('function');
      expect(typeof authLimiter).toBe('function');
    });
  });

  describe('auditLogger.js middleware', () => {
    test('is a function', () => {
      expect(typeof auditLogger).toBe('function');
    });

    test('calls next immediately and does not block request flow', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/health',
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        get: jest.fn().mockReturnValue('jest-agent'),
      };
      const res = {
        statusCode: 200,
        on: jest.fn(),
      };
      const next = jest.fn();

      auditLogger(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

});
