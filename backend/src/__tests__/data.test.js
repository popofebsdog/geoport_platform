import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../app.js';
import { pool, sequelize } from '../config/database.js';
import { DataFile } from '../models/DataFile.js';

describe('Data and DataFile route tests', () => {
  let querySpy;
  let requestCounter = 0;

  const withIp = (req) => req.set('X-Forwarded-For', `127.0.1.${++requestCounter}`);

  beforeEach(() => {
    jest.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
    querySpy = jest.spyOn(pool, 'query').mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('/api/data routes', () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const fileId = '123e4567-e89b-12d3-a456-426614174001';

    test('GET /api/data returns static endpoint listing', async () => {
      const response = await withIp(request(app).get('/api/data'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.endpoints)).toBe(true);
      expect(response.body.endpoints).toEqual(expect.arrayContaining([
        'POST /api/data/upload - 上傳資料檔案',
        'GET /api/data/project/:projectId - 獲取專案的資料列表',
      ]));
    });

    test('GET /api/data/project/:projectId returns 200', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/data/project/${projectId}`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/data/project/:projectId/geojson-list returns 200', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/data/project/${projectId}/geojson-list`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/data/project/:projectId/basemaps returns 200', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/data/project/${projectId}/basemaps`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/data/project/:projectId/geojson returns 200', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/data/project/${projectId}/geojson`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    test('GET /api/data/:id returns 404 when no row found', async () => {
      querySpy.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await withIp(request(app).get(`/api/data/${fileId}`));

      expect([404, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/data/upload without auth returns 401', async () => {
      const response = await withIp(request(app).post('/api/data/upload').send({}));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('PUT /api/data/:id without auth returns 401', async () => {
      const response = await withIp(request(app).put(`/api/data/${fileId}`).send({ data_name: 'x' }));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('DELETE /api/data/:id without auth returns 401', async () => {
      const response = await withIp(request(app).delete(`/api/data/${fileId}`));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/data/feature/upload without auth returns 401', async () => {
      const response = await withIp(request(app).post('/api/data/feature/upload').send({}));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('/api/data-files routes', () => {
    const fileId = '123e4567-e89b-12d3-a456-426614174010';

    test('GET /api/data-files returns 200 with empty list', async () => {
      jest.spyOn(DataFile, 'findAll').mockResolvedValueOnce([]);

      const response = await withIp(request(app).get('/api/data-files'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ dataFiles: [] });
    });

    test('GET /api/data-files/deleted returns 200', async () => {
      jest.spyOn(DataFile, 'findAll').mockResolvedValueOnce([]);

      const response = await withIp(request(app).get('/api/data-files/deleted'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ dataFiles: [] });
    });

    test('GET /api/data-files/:id returns 404 when record is missing', async () => {
      jest.spyOn(DataFile, 'findByPk').mockResolvedValueOnce(null);

      const response = await withIp(request(app).get(`/api/data-files/${fileId}`));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/data-files with empty body returns 400 or 500', async () => {
      jest.spyOn(DataFile, 'create').mockRejectedValueOnce(new Error('validation failed'));

      const response = await withIp(request(app).post('/api/data-files').send({}));

      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('PUT /api/data-files/:id updates data file', async () => {
      const mockDataFile = {
        fileId,
        fileName: 'before.geojson',
        update: jest.fn().mockResolvedValue(undefined),
      };
      jest.spyOn(DataFile, 'findByPk').mockResolvedValueOnce(mockDataFile);

      const response = await withIp(request(app).put(`/api/data-files/${fileId}`).send({ fileName: 'after.geojson' }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockDataFile.update).toHaveBeenCalledWith({ fileName: 'after.geojson' });
    });

    test('DELETE /api/data-files/:id soft deletes data file', async () => {
      const mockDataFile = {
        fileId,
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      jest.spyOn(DataFile, 'findByPk').mockResolvedValueOnce(mockDataFile);

      const response = await withIp(request(app).delete(`/api/data-files/${fileId}`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockDataFile.destroy).toHaveBeenCalledTimes(1);
    });

    test('DELETE /api/data-files/:id/permanent permanently deletes data file', async () => {
      const mockDataFile = {
        fileId,
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      const findByPkSpy = jest.spyOn(DataFile, 'findByPk').mockResolvedValueOnce(mockDataFile);

      const response = await withIp(request(app).delete(`/api/data-files/${fileId}/permanent`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(findByPkSpy).toHaveBeenCalledWith(fileId, { paranoid: false });
      expect(mockDataFile.destroy).toHaveBeenCalledWith({ force: true });
    });

    test('PATCH /api/data-files/:id/restore restores data file', async () => {
      const mockDataFile = {
        fileId,
        restore: jest.fn().mockResolvedValue(undefined),
      };
      const findByPkSpy = jest.spyOn(DataFile, 'findByPk').mockResolvedValueOnce(mockDataFile);

      const response = await withIp(request(app).patch(`/api/data-files/${fileId}/restore`));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(findByPkSpy).toHaveBeenCalledWith(fileId, { paranoid: false });
      expect(mockDataFile.restore).toHaveBeenCalledTimes(1);
    });
  });
});
