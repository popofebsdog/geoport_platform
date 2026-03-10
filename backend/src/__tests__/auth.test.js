import request from 'supertest';
import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { pool, sequelize } from '../config/database.js';

describe('Auth route tests', () => {
  let querySpy;
  let requestCounter = 0;

  const withIp = (req) => req.set('X-Forwarded-For', `127.0.0.${++requestCounter}`);

  const adminToken = () => jwt.sign(
    { userId: 1, username: 'testuser', role: 'admin' },
    'test-secret-key'
  );

  const editorToken = () => jwt.sign(
    { userId: 2, username: 'editor', role: 'editor' },
    'test-secret-key'
  );

  beforeEach(() => {
    jest.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
    querySpy = jest.spyOn(pool, 'query').mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('returns 400 when body is missing required fields', async () => {
      const response = await withIp(request(app).post('/api/auth/login')).send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('returns 400 when password is missing', async () => {
      const response = await withIp(request(app).post('/api/auth/login')).send({
        username: 'testuser'
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('returns 401 when user does not exist', async () => {
      querySpy.mockResolvedValueOnce({ rows: [] });

      const response = await withIp(request(app).post('/api/auth/login')).send({
        username: 'nouser',
        password: 'password123'
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    test('returns 401 when password is incorrect', async () => {
      querySpy.mockResolvedValueOnce({
        rows: [{
          user_id: 1,
          username: 'testuser',
          email: 'test@example.com',
          display_name: 'Test User',
          role: 'editor',
          password_hash: bcrypt.hashSync('password123', 12),
          is_active: true
        }]
      });

      const response = await withIp(request(app).post('/api/auth/login')).send({
        username: 'testuser',
        password: 'wrong-password'
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    test('returns 200 with token and user on successful login', async () => {
      querySpy
        .mockResolvedValueOnce({
          rows: [{
            user_id: 1,
            username: 'testuser',
            email: 'test@example.com',
            display_name: 'Test User',
            role: 'admin',
            password_hash: bcrypt.hashSync('password123', 12),
            is_active: true
          }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await withIp(request(app).post('/api/auth/login')).send({
        username: 'testuser',
        password: 'password123'
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeTruthy();
      expect(response.body.user).toMatchObject({
        userId: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      });
      expect(querySpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST /api/auth/register', () => {
    test('returns 400 when required fields are missing', async () => {
      const response = await withIp(request(app).post('/api/auth/register')).send({
        username: 'newuser'
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('returns 409 when username or email already exists', async () => {
      querySpy.mockResolvedValueOnce({ rows: [{ user_id: 1 }] });

      const response = await withIp(request(app).post('/api/auth/register')).send({
        username: 'existing',
        email: 'existing@example.com',
        password: 'password123'
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    test('returns 201 with token and user on successful register', async () => {
      querySpy
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            user_id: 9,
            username: 'newuser',
            email: 'newuser@example.com',
            display_name: 'New User',
            role: 'editor'
          }]
        });

      const response = await withIp(request(app).post('/api/auth/register')).send({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        display_name: 'New User'
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeTruthy();
      expect(response.body.user).toMatchObject({
        userId: 9,
        username: 'newuser',
        email: 'newuser@example.com',
        displayName: 'New User',
        role: 'editor'
      });
    });

    test('hashes password before saving during register', async () => {
      querySpy
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            user_id: 10,
            username: 'hashuser',
            email: 'hash@example.com',
            display_name: 'Hash User',
            role: 'editor'
          }]
        });

      const rawPassword = 'password123';

      const response = await withIp(request(app).post('/api/auth/register')).send({
        username: 'hashuser',
        email: 'hash@example.com',
        password: rawPassword,
        display_name: 'Hash User'
      });

      expect(response.status).toBe(201);

      const insertArgs = querySpy.mock.calls[1][1];
      const savedHash = insertArgs[3];

      expect(savedHash).not.toBe(rawPassword);
      expect(bcrypt.compareSync(rawPassword, savedHash)).toBe(true);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('returns 200 with success', async () => {
      const response = await withIp(request(app).post('/api/auth/logout'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/profile', () => {
    test('returns 401 when no token is provided', async () => {
      const response = await withIp(request(app).get('/api/auth/profile'));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('returns 200 with user for valid token', async () => {
      querySpy.mockResolvedValueOnce({
        rows: [{
          user_id: 1,
          username: 'testuser',
          email: 'test@example.com',
          display_name: 'Test User',
          role: 'admin'
        }]
      });

      const response = await withIp(request(app).get('/api/auth/profile'))
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        user_id: 1,
        username: 'testuser',
        role: 'admin'
      });
    });

    test('returns 404 when profile user is not found', async () => {
      querySpy.mockResolvedValueOnce({ rows: [] });

      const response = await withIp(request(app).get('/api/auth/profile'))
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/users', () => {
    test('returns 401 when no auth token is provided', async () => {
      const response = await withIp(request(app).get('/api/auth/users'));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('returns 403 when authenticated user is not admin', async () => {
      const response = await withIp(request(app).get('/api/auth/users'))
        .set('Authorization', `Bearer ${editorToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('returns 200 with users list for admin', async () => {
      querySpy.mockResolvedValueOnce({
        rows: [
          {
            user_id: 1,
            username: 'admin',
            email: 'admin@example.com',
            display_name: 'Admin',
            role: 'admin',
            is_active: true,
            is_verified: true
          }
        ]
      });

      const response = await withIp(request(app).get('/api/auth/users'))
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users).toHaveLength(1);
    });
  });

  describe('PUT /api/auth/users/:id', () => {
    test('returns 401 when no auth token is provided', async () => {
      const response = await withIp(request(app).put('/api/auth/users/1')).send({ role: 'admin' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('returns 403 when authenticated user is not admin', async () => {
      const response = await withIp(request(app).put('/api/auth/users/1'))
        .set('Authorization', `Bearer ${editorToken()}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('returns 200 when admin updates user', async () => {
      querySpy.mockResolvedValueOnce({
        rows: [{
          user_id: 1,
          username: 'updateduser',
          email: 'updated@example.com',
          role: 'editor',
          is_active: true
        }]
      });

      const response = await withIp(request(app).put('/api/auth/users/1'))
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ role: 'editor', is_active: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        user_id: 1,
        role: 'editor',
        is_active: true
      });
    });
  });

  describe('GET /api/auth/', () => {
    test('returns endpoint listing', async () => {
      const response = await withIp(request(app).get('/api/auth/'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.endpoints)).toBe(true);
      expect(response.body.endpoints).toEqual(expect.arrayContaining([
        'POST /api/auth/login - 用戶登入',
        'POST /api/auth/register - 用戶註冊',
        'POST /api/auth/logout - 用戶登出',
        'GET /api/auth/profile - 獲取用戶資料'
      ]));
    });
  });
});
