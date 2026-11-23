import { jest, test, expect, afterEach } from '@jest/globals';

const servers = [];
process.env.LOG_LEVEL = 'silent';
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  })));
});

test('the retired probe endpoint cannot send requests to internal services', async () => {
  const { default: app } = await import('../src/app.js');
  const outbound = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('outbound request blocked by test'));
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise(resolve => server.once('listening', resolve));
  const { request } = await import('node:http');
  try {
    const status = await new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port: server.address().port, path: '/api/probe', method: 'POST', headers: { 'content-type': 'application/json' } }, res => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.end(JSON.stringify({ url: 'http://127.0.0.1:5432', method: 'GET' }));
    });
    expect(status).toBe(404);
    expect(outbound).not.toHaveBeenCalled();
  } finally {
    outbound.mockRestore();
  }
});
