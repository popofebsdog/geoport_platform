import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../app.js';
import { sequelize } from '../config/database.js';

describe('Health smoke tests', () => {
  beforeAll(() => {
    jest.spyOn(sequelize, 'authenticate').mockResolvedValue(undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('GET /api/health returns 200 with status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('GET /api/health/ready returns 200', async () => {
    const response = await request(app).get('/api/health/ready');

    expect(response.status).toBe(200);
  });
});
