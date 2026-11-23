import { jest, beforeEach, test, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'authorization-regression-secret';
const id = '11111111-1111-4111-8111-111111111111';
const findByPk = jest.fn();
jest.unstable_mockModule('../src/config/database.js', () => ({ sequelize: { define: () => ({ findByPk }) } }));
const { authenticate } = await import('../src/middleware/auth.js');
const { signToken } = await import('../src/services/authTokenService.js');
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const token = role => {
  const user = { user_id: id, username: 'fixture', role, password_hash: 'fixture-password-hash', is_active: true };
  findByPk.mockResolvedValue(user);
  return signToken(user);
};

beforeEach(() => jest.clearAllMocks());

test.each(['POST', 'PUT', 'PATCH', 'DELETE'])('viewer cannot use %s on an authenticated route', async method => {
  const req = { method, headers: { authorization: `Bearer ${token('viewer')}` } };
  const res = response(), next = jest.fn();
  await authenticate(req, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});

test.each(['admin', 'editor'])('%s can write', async role => {
  const next = jest.fn();
  await authenticate({ method: 'POST', headers: { authorization: `Bearer ${token(role)}` } }, response(), next);
  expect(next).toHaveBeenCalledTimes(1);
});

test('viewer can read', async () => {
  const next = jest.fn();
  await authenticate({ method: 'GET', headers: { authorization: `Bearer ${token('viewer')}` } }, response(), next);
  expect(next).toHaveBeenCalledTimes(1);
});

test('missing role cannot write', async () => {
  const res = response(), next = jest.fn();
  await authenticate({ method: 'POST', headers: { authorization: `Bearer ${token(undefined)}` } }, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});

test('legacy tokens without password binding require a fresh login', async () => {
  const value = jwt.sign({ userId: id, role: 'admin' }, process.env.JWT_SECRET);
  const res = response(), next = jest.fn();
  await authenticate({ method: 'GET', headers: { authorization: `Bearer ${value}` } }, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
  expect(findByPk).not.toHaveBeenCalled();
});
