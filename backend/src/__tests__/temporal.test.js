import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { pool, sequelize } from '../config/database.js';

describe('Temporal routes smoke tests', () => {
  let querySpy;
  let connectSpy;
  let mockClient;
  let requestCounter = 0;

  const withIp = (req) => req.set('X-Forwarded-For', `127.0.2.${++requestCounter}`);

  beforeAll(() => {
    jest.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, 'query').mockResolvedValue({ rows: [], rowCount: 0 });
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn()
    };
    connectSpy = jest.spyOn(pool, 'connect').mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('A. /api (temporalData routes)', () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174100';
    const temporalId = '123e4567-e89b-12d3-a456-426614174101';

    test('GET /api/projects/:projectId/temporal-data returns 200', async () => {
      const response = await withIp(request(app).get(`/api/projects/${projectId}/temporal-data`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/temporal-data/:temporalId returns 404 when not found', async () => {
      const response = await withIp(request(app).get(`/api/temporal-data/${temporalId}`));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/projects/:projectId/temporal-data/upload without file returns error status', async () => {
      const response = await withIp(
        request(app).post(`/api/projects/${projectId}/temporal-data/upload`).field('name', 'no-file-upload')
      );

      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    test('PUT /api/temporal-data/:temporalId returns success when update row exists', async () => {
      querySpy.mockResolvedValueOnce({ rows: [{ temporal_id: temporalId, name: 'updated' }], rowCount: 1 });

      const response = await withIp(
        request(app).put(`/api/temporal-data/${temporalId}`).send({ name: 'updated' })
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('DELETE /api/temporal-data/:temporalId returns success when row exists', async () => {
      querySpy.mockResolvedValueOnce({ rows: [{ temporal_id: temporalId }], rowCount: 1 });

      const response = await withIp(request(app).delete(`/api/temporal-data/${temporalId}`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('GET /api/temporal-data/:temporalId/chart handles empty db result', async () => {
      const response = await withIp(request(app).get(`/api/temporal-data/${temporalId}/chart`));

      expect([404, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('B. /api/temporal-data (parser routes)', () => {
    const temporalId = '123e4567-e89b-12d3-a456-426614174102';

    test('POST /api/temporal-data/:temporalId/parse hits parser route', async () => {
      const response = await withIp(
        request(app)
          .post(`/api/temporal-data/${temporalId}/parse`)
          .send({ xAxisColumns: ['date'], yAxisColumns: ['value'] })
      );

      expect([404, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(querySpy).toHaveBeenCalled();
    });

    test('GET /api/temporal-data/:temporalId/columns hits parser columns route', async () => {
      const response = await withIp(request(app).get(`/api/temporal-data/${temporalId}/columns`));

      expect([404, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(querySpy).toHaveBeenCalled();
    });
  });

  describe('C. /api/temporal-data (chart routes)', () => {
    const temporalId = '123e4567-e89b-12d3-a456-426614174103';

    test('POST /api/temporal-data/:temporalId/chart/apex handles empty chart config', async () => {
      const response = await withIp(
        request(app).post(`/api/temporal-data/${temporalId}/chart/apex`).send({ chartType: 'line' })
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(querySpy).toHaveBeenCalled();
    });

    test('GET /api/temporal-data/:temporalId/chart/preview handles empty db result', async () => {
      const response = await withIp(request(app).get(`/api/temporal-data/${temporalId}/chart/preview`));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(querySpy).toHaveBeenCalled();
    });
  });

  describe('D. /api/temporal-data-enhanced', () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174104';
    const temporalId = '123e4567-e89b-12d3-a456-426614174105';

    test('POST /api/temporal-data-enhanced/:projectId/upload without file returns error status', async () => {
      const response = await withIp(
        request(app).post(`/api/temporal-data-enhanced/${projectId}/upload`).field('name', 'enhanced-no-file')
      );

      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    test('GET /api/temporal-data-enhanced/:projectId/list returns 200 with mocked rows', async () => {
      const response = await withIp(request(app).get(`/api/temporal-data-enhanced/${projectId}/list`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/temporal-data-enhanced/:temporalId/chart handles empty db result', async () => {
      const response = await withIp(request(app).get(`/api/temporal-data-enhanced/${temporalId}/chart`));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/temporal-data-enhanced/:temporalId/json handles missing json file', async () => {
      const response = await withIp(request(app).get(`/api/temporal-data-enhanced/${temporalId}/json`));

      expect([404, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/temporal-data-enhanced/:temporalId/parse handles empty db result', async () => {
      const response = await withIp(request(app).post(`/api/temporal-data-enhanced/${temporalId}/parse`).send({}));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/temporal-data-enhanced/:temporalId returns 404 when not found', async () => {
      const response = await withIp(request(app).get(`/api/temporal-data-enhanced/${temporalId}`));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('PUT /api/temporal-data-enhanced/:temporalId updates successfully when row exists', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ temporal_id: temporalId, name: 'updated enhanced' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(
        request(app)
          .put(`/api/temporal-data-enhanced/${temporalId}`)
          .send({ name: 'updated enhanced', xAxisColumns: ['date'], yAxisColumns: ['value'] })
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    test('DELETE /api/temporal-data-enhanced/:temporalId deletes successfully when row exists', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ temporal_id: temporalId }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).delete(`/api/temporal-data-enhanced/${temporalId}`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });
});
