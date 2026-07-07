import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { query } from '../config/db.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import {
  requireAuth,
  blockGuests,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.js';
import { normalizePhone } from '../utils/phone.js';
import { sendSms } from '../services/sms.js';

export const usersRouter = Router();

const PUBLIC_FIELDS = `id, email, phone, phone_verified, role, language, is_guest,
  push_enabled, sms_enabled, email_enabled, quiet_start, quiet_end,
  date_joined, active`;

/** Normalize an incoming phone to E.164 or reject it with a helpful 400. */
function requireValidPhone(raw) {
  const phone = normalizePhone(raw);
  if (!phone) throw new ApiError(400, 'Enter a valid Kenyan phone number, e.g. 0712 345 678');
  return phone;
}

const sanitize = (u) => u;

// ── Schemas ────────────────────────────────────────────────────────────
const registerSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(7).max(20).optional(),
    password: z.string().min(8),
    role: z.enum(['farmer', 'business', 'pilot', 'general']).default('general'),
    language: z.enum(['en', 'sw']).default('en'),
  })
  .refine((d) => d.email || d.phone, { message: 'Email or phone is required' });

const loginSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string(),
  })
  .refine((d) => d.email || d.phone, { message: 'Email or phone is required' });

// ── Register (FR-01, FR-03) ───────────────────────────────────────────
usersRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    if (data.phone) data.phone = requireValidPhone(data.phone);
    const existing = await query(
      'SELECT id FROM users WHERE ($1::text IS NOT NULL AND email = $1) OR ($2::text IS NOT NULL AND phone = $2)',
      [data.email ?? null, data.phone ?? null],
    );
    if (existing.rowCount) throw new ApiError(409, 'An account with these details already exists');

    const hash = await bcrypt.hash(data.password, 12); // bcrypt per SRS 4.2
    const { rows } = await query(
      `INSERT INTO users (email, phone, password_hash, role, language)
       VALUES ($1,$2,$3,$4,$5) RETURNING ${PUBLIC_FIELDS}`,
      [data.email ?? null, data.phone ?? null, hash, data.role, data.language],
    );
    const user = rows[0];
    res.status(201).json({
      user: sanitize(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    });
  }),
);

// ── Login (FR-02) ─────────────────────────────────────────────────────
usersRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    // Normalize so "0712 345 678" logs into the account stored as +254712345678.
    if (data.phone) data.phone = normalizePhone(data.phone) || data.phone;
    const { rows } = await query(
      `SELECT * FROM users WHERE ($1::text IS NOT NULL AND email = $1) OR ($2::text IS NOT NULL AND phone = $2)`,
      [data.email ?? null, data.phone ?? null],
    );
    const user = rows[0];
    if (!user || !user.password_hash) throw new ApiError(401, 'Invalid credentials');
    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw new ApiError(401, 'Invalid credentials');
    if (!user.active) throw new ApiError(403, 'Account is deactivated');

    delete user.password_hash;
    delete user.reset_token;
    delete user.reset_expires_at;
    delete user.phone_otp_hash;
    delete user.phone_otp_expires_at;
    res.json({
      user,
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    });
  }),
);

// ── Guest mode (FR-07) ────────────────────────────────────────────────
usersRouter.post(
  '/guest',
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `INSERT INTO users (is_guest, role) VALUES (TRUE, 'general') RETURNING ${PUBLIC_FIELDS}`,
    );
    const user = rows[0];
    res.status(201).json({
      user,
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    });
  }),
);

// ── Refresh access token (FR-02, NFR 4.2) ─────────────────────────────
usersRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) throw new ApiError(400, 'refreshToken required');
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, 'Invalid refresh token');
    }
    const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [payload.sub]);
    const user = rows[0];
    if (!user || !user.active) throw new ApiError(401, 'User not found');
    res.json({ accessToken: signAccessToken(user), refreshToken: signRefreshToken(user) });
  }),
);

// ── Forgot password (FR-06) ───────────────────────────────────────────
usersRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    if (!email) throw new ApiError(400, 'email required');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const { rowCount } = await query(
      'UPDATE users SET reset_token = $1, reset_expires_at = $2 WHERE email = $3',
      [token, expires, email],
    );
    // Always respond 200 to avoid leaking which emails exist.
    // In production this token is emailed; in dev we return it for convenience.
    res.json({
      message: 'If that account exists, a reset link has been sent.',
      ...(process.env.NODE_ENV !== 'production' && rowCount ? { devResetToken: token } : {}),
    });
  }),
);

// ── Reset password (FR-06) ────────────────────────────────────────────
usersRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body || {};
    if (!token || !password || password.length < 8)
      throw new ApiError(400, 'token and password (min 8 chars) required');
    const hash = await bcrypt.hash(password, 12);
    const { rowCount } = await query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires_at = NULL
       WHERE reset_token = $2 AND reset_expires_at > now()`,
      [hash, token],
    );
    if (!rowCount) throw new ApiError(400, 'Invalid or expired reset token');
    res.json({ message: 'Password updated' });
  }),
);

// ── Current user ──────────────────────────────────────────────────────
usersRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [req.user.id]);
    if (!rows[0]) throw new ApiError(404, 'User not found');
    res.json({ user: rows[0] });
  }),
);

// ── Update profile + preferences (FR-03, FR-06, FR-24, FR-29) ─────────
const updateSchema = z.object({
  role: z.enum(['farmer', 'business', 'pilot', 'general']).optional(),
  language: z.enum(['en', 'sw']).optional(),
  push_enabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  quiet_start: z.number().int().min(0).max(23).nullable().optional(),
  quiet_end: z.number().int().min(0).max(23).nullable().optional(),
  fcm_token: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
});

usersRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    if (data.phone) {
      data.phone = requireValidPhone(data.phone);
      data.phone_verified = false; // a changed number must be re-verified by OTP
    }
    const keys = Object.keys(data);
    if (!keys.length) throw new ApiError(400, 'No fields to update');
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => data[k]);
    values.push(req.user.id);
    const { rows } = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING ${PUBLIC_FIELDS}`,
      values,
    );
    res.json({ user: rows[0] });
  }),
);

// ── Phone verification for SMS alerts (FR-26) ─────────────────────────
const OTP_TTL_MINUTES = 10;
const otpHash = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

// Send a 6-digit code to the number. Also saves the number on the profile.
usersRouter.post(
  '/phone/request-otp',
  requireAuth,
  asyncHandler(async (req, res) => {
    const phone = requireValidPhone(req.body?.phone || req.user.phone);

    const taken = await query('SELECT id FROM users WHERE phone = $1 AND id <> $2', [
      phone,
      req.user.id,
    ]);
    if (taken.rowCount) throw new ApiError(409, 'That number belongs to another account');

    // Light rate limit: at most one code per minute.
    const prev = await query('SELECT phone_otp_expires_at FROM users WHERE id = $1', [req.user.id]);
    const prevExpires = prev.rows[0]?.phone_otp_expires_at;
    if (prevExpires) {
      const issuedAt = new Date(prevExpires).getTime() - OTP_TTL_MINUTES * 60_000;
      if (Date.now() - issuedAt < 60_000)
        throw new ApiError(429, 'A code was just sent — wait a minute before requesting another');
    }

    const code = String(crypto.randomInt(100000, 1000000));
    await query(
      `UPDATE users SET phone = $1, phone_verified = FALSE, phone_otp_hash = $2,
         phone_otp_expires_at = now() + interval '${OTP_TTL_MINUTES} minutes'
       WHERE id = $3`,
      [phone, otpHash(code), req.user.id],
    );
    const sent = await sendSms(
      phone,
      `Your Dalili verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    );
    res.json({
      message: sent.ok
        ? `Verification code sent to ${phone}`
        : `Code generated for ${phone} (${sent.detail})`,
      phone,
      // In dev without an SMS provider, surface the code so the flow is testable.
      ...(process.env.NODE_ENV !== 'production' && !sent.ok ? { devOtp: code } : {}),
    });
  }),
);

// Confirm the code: marks the phone verified and switches SMS alerts on.
usersRouter.post(
  '/phone/verify-otp',
  requireAuth,
  asyncHandler(async (req, res) => {
    const code = String(req.body?.code || '').trim();
    if (!/^\d{6}$/.test(code)) throw new ApiError(400, 'Enter the 6-digit code from the SMS');
    const { rows } = await query(
      `UPDATE users SET phone_verified = TRUE, sms_enabled = TRUE,
          phone_otp_hash = NULL, phone_otp_expires_at = NULL
        WHERE id = $1 AND phone_otp_hash = $2 AND phone_otp_expires_at > now()
        RETURNING ${PUBLIC_FIELDS}`,
      [req.user.id, otpHash(code)],
    );
    if (!rows[0]) throw new ApiError(400, 'Invalid or expired code — request a new one');
    res.json({ user: rows[0], message: 'Phone verified — SMS alerts are on' });
  }),
);

// ── Delete account (FR-06) ────────────────────────────────────────────
usersRouter.delete(
  '/me',
  requireAuth,
  blockGuests,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted' });
  }),
);
