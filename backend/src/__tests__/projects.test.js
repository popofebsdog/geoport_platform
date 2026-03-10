import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import app from '../app.js';
import { pool, sequelize } from '../config/database.js';
import { Project } from '../models/Project.js';

describe('Project-related route tests', () => {
  const validId = '11111111-1111-1111-1111-111111111111';
  let querySpy;
  let authSpy;
  const projectSpies = [];

  const token = () => jwt.sign(
    { userId: 1, username: 'tester', role: 'admin' },
    'test-secret-key'
  );

  beforeAll(() => {
    authSpy = jest.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, 'query').mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    querySpy.mockRestore();
    projectSpies.forEach((spy) => spy.mockRestore());
    projectSpies.length = 0;
  });

  afterAll(() => {
    authSpy.mockRestore();
  });

  describe('/api/projects', () => {
    test('GET /api/projects returns 200 with empty list', async () => {
      const findAndCountAllSpy = jest.spyOn(Project, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
      projectSpies.push(findAndCountAllSpy);

      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toEqual([]);
      expect(findAndCountAllSpy).toHaveBeenCalledTimes(1);
    });

    test('GET /api/projects/deleted returns 200 with empty list', async () => {
      const findAllSpy = jest.spyOn(Project, 'findAll').mockResolvedValue([]);
      projectSpies.push(findAllSpy);

      const response = await request(app).get('/api/projects/deleted');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toEqual([]);
      expect(findAllSpy).toHaveBeenCalledTimes(1);
    });

    test('GET /api/projects/:id returns 404 when project is not found', async () => {
      const findByPkSpy = jest.spyOn(Project, 'findByPk').mockResolvedValue(null);
      projectSpies.push(findByPkSpy);

      const response = await request(app).get(`/api/projects/${validId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(findByPkSpy).toHaveBeenCalledTimes(1);
    });

    test('POST /api/projects with empty body returns 400 with auth', async () => {
      const createSpy = jest.spyOn(Project, 'create').mockResolvedValue({});
      projectSpies.push(createSpy);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(createSpy).not.toHaveBeenCalled();
    });

    test('PUT /api/projects/:id with no auth returns 401', async () => {
      const response = await request(app).put(`/api/projects/${validId}`).send({ name: 'x' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('DELETE /api/projects/:id with no auth returns 401', async () => {
      const response = await request(app).delete(`/api/projects/${validId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('PATCH /api/projects/:id/bookmark with no auth returns 401', async () => {
      const response = await request(app).patch(`/api/projects/${validId}/bookmark`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('PATCH /api/projects/:id/restore with no auth returns 401', async () => {
      const response = await request(app).patch(`/api/projects/${validId}/restore`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('/api/parent-projects', () => {
    test('GET /api/parent-projects returns 200 with empty list', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app).get('/api/parent-projects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('GET /api/parent-projects/:id returns 404 when not found', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app).get(`/api/parent-projects/${validId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/parent-projects with no auth returns 401', async () => {
      const response = await request(app).post('/api/parent-projects').send({ name: 'p' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/parent-projects/:id/children returns 200', async () => {
      querySpy
        .mockResolvedValueOnce({ rows: [{ project_id: validId, name: 'parent' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app).get(`/api/parent-projects/${validId}/children`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.children).toEqual([]);
    });

    test('GET /api/parent-projects/:id/report-links returns 200', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app).get(`/api/parent-projects/${validId}/report-links`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('/api/child-projects', () => {
    test('GET /api/child-projects returns 200', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app).get('/api/child-projects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('GET /api/child-projects/:id returns 404 when not found', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app).get(`/api/child-projects/${validId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('PUT /api/child-projects/:id with no auth returns 401', async () => {
      const response = await request(app).put(`/api/child-projects/${validId}`).send({ name: 'x' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('DELETE /api/child-projects/:id with no auth returns 401', async () => {
      const response = await request(app).delete(`/api/child-projects/${validId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
