import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../app.js';
import { pool, sequelize } from '../config/database.js';
import { Report } from '../models/Report.js';

describe('Reports/Disaster/Warning route tests', () => {
  let authSpy;
  let requestCounter = 0;
  let querySpy;
  const reportSpies = [];

  const withIp = (req) => req.set('X-Forwarded-For', `127.0.2.${++requestCounter}`);

  beforeAll(() => {
    authSpy = jest.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, 'query').mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    querySpy.mockRestore();
    reportSpies.forEach((spy) => spy.mockRestore());
    reportSpies.length = 0;
  });

  afterAll(() => {
    authSpy.mockRestore();
  });

  describe('/api/reports', () => {
    const reportId = '11111111-1111-1111-1111-111111111111';

    test('GET /api/reports returns 200', async () => {
      const findAllSpy = jest.spyOn(Report, 'findAll').mockResolvedValue([]);
      reportSpies.push(findAllSpy);

      const response = await withIp(request(app).get('/api/reports'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toEqual([]);
      expect(findAllSpy).toHaveBeenCalledTimes(1);
    });

    test('GET /api/reports/deleted returns 200', async () => {
      const findAllSpy = jest.spyOn(Report, 'findAll').mockResolvedValue([]);
      reportSpies.push(findAllSpy);

      const response = await withIp(request(app).get('/api/reports/deleted'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reports).toEqual([]);
      expect(findAllSpy).toHaveBeenCalledTimes(1);
    });

    test('GET /api/reports/:id returns 404 when report is missing', async () => {
      const findByPkSpy = jest.spyOn(Report, 'findByPk').mockResolvedValue(null);
      reportSpies.push(findByPkSpy);

      const response = await withIp(request(app).get(`/api/reports/${reportId}`));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(findByPkSpy).toHaveBeenCalledTimes(1);
    });

    test('POST /api/reports with empty body returns 400 or 500', async () => {
      const response = await withIp(request(app).post('/api/reports').send({}));

      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('PUT /api/reports/:id updates report', async () => {
      const mockReport = { update: jest.fn().mockResolvedValue(undefined) };
      const findByPkSpy = jest.spyOn(Report, 'findByPk').mockResolvedValue(mockReport);
      reportSpies.push(findByPkSpy);

      const response = await withIp(request(app).put(`/api/reports/${reportId}`).send({ title: 'updated' }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockReport.update).toHaveBeenCalledWith({ title: 'updated' });
    });

    test('DELETE /api/reports/:id soft deletes report', async () => {
      const mockReport = { destroy: jest.fn().mockResolvedValue(undefined) };
      const findByPkSpy = jest.spyOn(Report, 'findByPk').mockResolvedValue(mockReport);
      reportSpies.push(findByPkSpy);

      const response = await withIp(request(app).delete(`/api/reports/${reportId}`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockReport.destroy).toHaveBeenCalledTimes(1);
    });

    test('PATCH /api/reports/:id/bookmark toggles bookmark', async () => {
      const mockReport = {
        isBookmarked: false,
        save: jest.fn().mockResolvedValue(undefined),
      };
      const findByPkSpy = jest.spyOn(Report, 'findByPk').mockResolvedValue(mockReport);
      reportSpies.push(findByPkSpy);

      const response = await withIp(request(app).patch(`/api/reports/${reportId}/bookmark`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockReport.save).toHaveBeenCalledTimes(1);
      expect(mockReport.isBookmarked).toBe(true);
    });

    test('PATCH /api/reports/:id/restore restores report', async () => {
      const restoreSpy = jest.spyOn(Report, 'restore').mockResolvedValue(1);
      const findByPkSpy = jest.spyOn(Report, 'findByPk').mockResolvedValue({ reportId });
      reportSpies.push(restoreSpy, findByPkSpy);

      const response = await withIp(request(app).patch(`/api/reports/${reportId}/restore`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(restoreSpy).toHaveBeenCalledTimes(1);
      expect(findByPkSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('/api/disaster-points', () => {
    const projectId = '22222222-2222-2222-2222-222222222222';
    const pointId = '33333333-3333-3333-3333-333333333333';

    test('GET /api/disaster-points/project/:projectId returns 200', async () => {
      querySpy
        .mockResolvedValueOnce({ rows: [{ project_id: projectId, name: 'p1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/disaster-points/project/${projectId}`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('GET /api/disaster-points/:id returns 404 when missing', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/disaster-points/${pointId}`));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/disaster-points without auth returns 401', async () => {
      const response = await withIp(request(app).post('/api/disaster-points').send({}));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('PUT /api/disaster-points/:id without auth returns 401', async () => {
      const response = await withIp(request(app).put(`/api/disaster-points/${pointId}`).send({ name: 'x' }));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('DELETE /api/disaster-points/:id without auth returns 401', async () => {
      const response = await withIp(request(app).delete(`/api/disaster-points/${pointId}`));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('DELETE /api/disaster-points/:id/media/:mediaId without auth returns 401', async () => {
      const response = await withIp(request(app).delete(`/api/disaster-points/${pointId}/media/44444444-4444-4444-4444-444444444444`));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('/api/warning-regions', () => {
    const regionCode = 'test-region';

    test('GET /api/warning-regions returns 200', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get('/api/warning-regions'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('GET /api/warning-regions/:regionCode returns 404 when missing', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/warning-regions/${regionCode}`));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/warning-regions/:regionCode/data returns 200', async () => {
      querySpy
        .mockResolvedValueOnce({ rows: [{ region_id: '55555555-5555-5555-5555-555555555555', api_config: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/warning-regions/${regionCode}/data`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('POST /api/warning-regions/:regionCode/data without auth returns 401', async () => {
      const response = await withIp(request(app).post(`/api/warning-regions/${regionCode}/data`).send({}));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/warning-regions/create-project without auth returns 401', async () => {
      const response = await withIp(request(app).post('/api/warning-regions/create-project').send({ regionName: 'r', regionCode: 'c' }));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('GET /api/warning-regions/:regionCode/point-colors returns 200', async () => {
      querySpy
        .mockResolvedValueOnce({ rows: [{ region_id: '66666666-6666-6666-6666-666666666666' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/warning-regions/${regionCode}/point-colors`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('GET /api/warning-regions/:regionCode/inspection-records returns 200', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/warning-regions/${regionCode}/inspection-records`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('GET /api/warning-regions/:regionCode/alert-lights returns 200', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/warning-regions/${regionCode}/alert-lights`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('GET /api/warning-regions/:regionCode/disaster-counts returns 200', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/warning-regions/${regionCode}/disaster-counts`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({});
    });
  });
});
