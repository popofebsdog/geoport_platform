import request from 'supertest';
import { jest } from '@jest/globals';

import app from '../app.js';

const createMockRes = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('Wave 2 security hardening', () => {
  describe('CORS policy', () => {
    test('accepts requests from allowed origin', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('rejects disallowed origin by omitting CORS allow-origin header', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://evil.example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('returns CORS preflight headers for allowed origin', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });

    test('does not return allow-origin for disallowed preflight origin', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://evil.example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Rate limiter hardening', () => {
    test('includes standard RateLimit headers on API responses', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    test('includes standard RateLimit headers on auth endpoint responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '198.51.100.21')
        .send({ username: 'nouser', password: 'badpass' });

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    test('returns 429 after exceeding auth rate limit', async () => {
      const clientIp = '198.51.100.99';

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', clientIp)
          .send({ username: `user-${attempt}`, password: 'badpass' });
      }

      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', clientIp)
        .send({ username: 'blocked-user', password: 'badpass' });

      expect(response.status).toBe(429);
      expect(response.body).toMatchObject({
        success: false,
        message: '登入嘗試過多，請 15 分鐘後再試',
      });
    });
  });

  describe('Helmet headers', () => {
    test('sets X-Content-Type-Options header', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('sets Strict-Transport-Security header', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
      expect(response.headers['strict-transport-security']).toContain('preload');
    });

    test('sets X-Frame-Options header', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    test('sets Content-Security-Policy header with default-src none', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.headers['content-security-policy']).toContain("default-src 'none'");
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });
  });

  describe('Body size limits', () => {
    test('rejects JSON payload larger than 1MB with 413', async () => {
      const oversizedPayload = { data: 'x'.repeat(1024 * 1024 + 1024) };

      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.55')
        .send(oversizedPayload);

      expect(response.status).toBe(413);
    });

    test('accepts smaller JSON payloads (not rejected with 413)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.56')
        .send({ username: 'small-user', password: 'small-pass' });

      expect(response.status).not.toBe(413);
    });
  });

  describe('Error handler hardening', () => {
    test('production 500 response hides internal message and stack', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      jest.resetModules();

      const { errorHandler } = await import(`../middleware/errorHandler.js?ts=${Date.now()}`);
      const err = {
        name: 'Error',
        message: 'database password leaked',
        stack: 'sensitive stack trace',
      };
      const req = {};
      const res = createMockRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '服務器內部錯誤',
      });

      process.env.NODE_ENV = originalNodeEnv;
      jest.resetModules();
    });

    test('non-production 500 response includes error details for debugging', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      jest.resetModules();

      const { errorHandler } = await import(`../middleware/errorHandler.js?ts=${Date.now()}`);
      const err = {
        name: 'Error',
        message: 'debug-visible message',
        stack: 'debug stack trace',
      };
      const req = {};
      const res = createMockRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'debug-visible message',
        stack: 'debug stack trace',
      });

      process.env.NODE_ENV = originalNodeEnv;
      jest.resetModules();
    });

    test('production non-500 errors preserve explicit error messages', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      jest.resetModules();

      const { errorHandler } = await import(`../middleware/errorHandler.js?ts=${Date.now()}`);
      const err = {
        name: 'Error',
        message: 'bad request details',
        statusCode: 400,
        stack: 'debug stack trace',
      };
      const req = {};
      const res = createMockRes();
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'bad request details',
      });

      process.env.NODE_ENV = originalNodeEnv;
      jest.resetModules();
    });
  });
});
