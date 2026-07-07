import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from './error.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, guest: user.is_guest },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl },
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

/** Require a valid access token; attaches req.user = { id, role, guest }. */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Authentication required'));
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    req.user = { id: payload.sub, role: payload.role, guest: !!payload.guest };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

/** Block guest users from write-heavy endpoints (FR-07 — limited features). */
export function blockGuests(req, _res, next) {
  if (req.user?.guest) return next(new ApiError(403, 'This feature requires a full account'));
  next();
}
