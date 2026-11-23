import { jest, test, expect, afterAll } from '@jest/globals';

process.env.LOG_LEVEL = 'silent';
const health = jest.fn();
jest.unstable_mockModule('../src/services/healthService.js', () => ({ getDeepHealth: health, checkTitilerHealth: jest.fn() }));
const { default: app } = await import('../src/app.js');
const { sequelize, pool } = await import('../src/config/database.js');
const server = app.listen(0,'127.0.0.1');
await new Promise(resolve => server.once('listening',resolve));
afterAll(async () => {
  await new Promise(resolve => { server.close(resolve);server.closeAllConnections(); });
  await sequelize.close(); await pool.end();
});
test.each([['ok',200],['warning',503],['error',503]])('readiness treats %s as HTTP %s without exposing internals', async (status, code) => {
  health.mockResolvedValue({status,components:{database:{status, message:'/private/database/path'}}});
  const result=await fetch(`http://127.0.0.1:${server.address().port}/api/ready`);
  const body=await result.json();
  expect(result.status).toBe(code);
  expect(body.components.database).toEqual({status});
  expect(JSON.stringify(body)).not.toContain('/private');
});
