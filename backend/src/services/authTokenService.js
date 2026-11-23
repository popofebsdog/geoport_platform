import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

// Bind sessions to the current password without exposing its stored hash in a JWT.
export const credentialVersion = passwordHash => createHmac('sha256', secret).update(passwordHash).digest('hex');

export function signToken(user) {
  if (!secret) return 'dev-no-secret';
  return jwt.sign({
    userId: user.user_id, username: user.username, role: user.role,
    credentialVersion: credentialVersion(user.password_hash)
  }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
}
