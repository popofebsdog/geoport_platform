import { jest, test, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import { requestLogger } from '../src/middleware/requestLogger.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { notFound } from '../src/middleware/notFound.js';
import { createLogger } from '../src/utils/logger.js';

let output;
let server;
let originalEnv;
beforeEach(() => {
  originalEnv = process.env;
  process.env = { ...originalEnv, LOG_FORMAT: 'json', LOG_LEVEL: 'info', LOG_REQUESTS: 'true' };
  output = '';
  for (const stream of [process.stdout, process.stderr]) {
    jest.spyOn(stream, 'write').mockImplementation(value => { output += value; return true; });
  }
});
afterEach(async () => {
  jest.restoreAllMocks();
  process.env = originalEnv;
  if (server) {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    server = undefined;
  }
});

test('request and not-found error logs exclude query credentials', async () => {
  const app = express();
  app.use(requestLogger());
  app.use(notFound);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const result = await fetch(`http://127.0.0.1:${server.address().port}/missing?token=synthetic-secret-42&key=another-secret`);
  await result.text();
  expect(result.status).toBe(404);
  expect(output).not.toContain('synthetic-secret-42');
  expect(output).not.toContain('another-secret');
  const events = output.trim().split('\n').filter(line => line.startsWith('{')).map(line => JSON.parse(line));
  expect(events).toHaveLength(2);
  expect(events.every(event => event.path === '/missing')).toBe(true);
});

test('URL queries and userinfo are removed from messages, metadata and error stacks', () => {
  const secretUrl = 'https://operator:synthetic-password@service.example/file?token=synthetic-token#synthetic-fragment';
  createLogger('test').error(`Failed ${secretUrl}`, {
    url: secretUrl, path: '/file?token=relative-secret',
    password: 'existing-secret-key', error: new Error(`Remote failure ${secretUrl}`)
  });
  for (const secret of ['synthetic-password', 'synthetic-token', 'synthetic-fragment', 'relative-secret', 'existing-secret-key']) {
    expect(output).not.toContain(secret);
  }
  expect(JSON.parse(output).message).toContain('https://service.example/file');
  expect(JSON.parse(output).path).toBe('/file');
});

test('HTTP logs identify the actor and correlate nested asynchronous service errors', async () => {
  const app = express();
  app.use(requestLogger());
  app.get('/audit', async (req, res) => {
    req.user = { userId: 'actor-fixture', role: 'admin' };
    await new Promise(resolve => setImmediate(resolve));
    createLogger('service').error('Service operation failed', { error: new Error('safe fixture error') });
    res.json({ success: true });
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const result = await fetch(`http://127.0.0.1:${server.address().port}/audit`);
  await result.text();
  const events = output.trim().split('\n').map(line => JSON.parse(line));
  expect(events).toHaveLength(2);
  for (const event of events) {
    expect(event.requestId).toBe(result.headers.get('x-request-id'));
    expect(event.userId).toBe('actor-fixture');
    expect(event.role).toBe('admin');
  }
  expect(events.find(event => event.scope === 'service').error.stack).toContain('safe fixture error');
});

test('messages and error causes redact credentials without losing the failure chain', () => {
  createLogger('service').error('request rejected Authorization: Bearer fixture-bearer password=fixture-password', {
    error: new Error('outer', { cause: new Error('inner token=fixture-token') }),
    password_hash: 'fixture-password-hash', credentialVersion: 'fixture-credential'
  });
  for (const secret of ['fixture-bearer','fixture-password','fixture-token','fixture-credential']) expect(output).not.toContain(secret);
  expect(JSON.parse(output).error.cause.message).toContain('inner');
});

test('malformed JSON never logs parser excerpts or submitted credentials', async () => {
  const app = express();
  app.use(requestLogger());
  app.use(express.json());
  app.post('/login', (_req, res) => res.end());
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const result = await fetch(`http://127.0.0.1:${server.address().port}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: 'x{"token":"fixture-parser-secret","password":"fixture-parser-password"}'
  });
  await result.text();
  expect(result.status).toBe(400);
  expect(output).not.toMatch(/fixture-parser-secret|fixture-parser-password/);
  expect(output).toContain('entity.parse.failed');
});
