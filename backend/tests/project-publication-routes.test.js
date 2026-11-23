import { jest, test, expect, afterEach } from '@jest/globals';
import express from 'express';

const identity = { kind: 'disaster', id: '11111111-1111-4111-8111-111111111111', expiresAt: '2026-11-30T00:00:00Z' };
const getSnapshot = jest.fn(async (kind, id) => ({ kind, project: { id, name: 'Scoped fixture' } }));
const resolveAsset = jest.fn();
jest.unstable_mockModule('../src/services/projectSnapshotService.js', () => ({ getProjectSnapshot: getSnapshot, resolvePublicationAsset: resolveAsset }));
jest.unstable_mockModule('../src/services/projectShareService.js', () => ({
  resolveProjectShare: jest.fn(async token => { if (token !== 'fixture-only') throw Object.assign(new Error('invalid'), { status: 404 }); return identity; }),
  createProjectShare: jest.fn(), listProjectShares: jest.fn(), revokeProjectShare: jest.fn()
}));
jest.unstable_mockModule('../src/services/projectReportService.js', () => ({ loadReportPhotos: jest.fn(), renderProjectReport: jest.fn() }));
const { sharedProject } = await import('../src/routes/projectPublications.js');
let server;
afterEach(async () => { if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); server = null; });
async function request(method = 'GET', token = 'fixture-only') {
  const app = express(); app.use('/share', sharedProject);
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ message: error.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const result = await fetch(`http://127.0.0.1:${server.address().port}/share?kind=warning&id=other-project`, {
      method, headers: { 'X-Share-Token': token }, signal: AbortSignal.timeout(1500)
    });
    return { status: result.status, cache: result.headers.get('cache-control'), data: await result.json() };
  } catch { return { status: 0 }; }
}

test('valid capabilities advance to a response and the stored target overrides request scope', async () => {
  const result = await request();
  expect(result.status).toBe(200);
  expect(result.data.data.project.id).toBe(identity.id);
  expect(result.cache).toContain('no-store');
  expect(getSnapshot).toHaveBeenCalledWith(identity.kind, identity.id);
});
test('guest routes reject writes even with a valid share', async () => { expect((await request('POST')).status).toBe(405); });
test('invalid shares do not reveal project data', async () => { expect((await request('GET', 'invalid')).status).toBe(404); });
