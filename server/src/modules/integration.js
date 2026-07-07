import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { getWeather } from '../services/weather.js';

/**
 * Third-Party Integration (FR-44, FR-45).
 *  - Public REST endpoint other apps can call for weather by location.
 *  - Webhook registration so external systems receive alert events.
 */

// ── Public API (FR-44) — no user auth, rate-limited at app level ───────
export const publicRouter = Router();

publicRouter.get(
  '/weather',
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw new ApiError(400, 'lat and lng are required');
    const wx = await getWeather(lat, lng);
    res.json({
      location: wx.place,
      updatedAt: wx.updatedAt,
      current: wx.current,
      daily: wx.daily,
    });
  }),
);

// ── Webhooks (FR-45) — authenticated management ───────────────────────
export const webhooksRouter = Router();
webhooksRouter.use(requireAuth);

const webhookSchema = z.object({
  target_url: z.string().url(),
  secret: z.string().min(8).optional(),
  active: z.boolean().default(true),
});

webhooksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM webhooks WHERE user_id = $1 ORDER BY created_at', [
      req.user.id,
    ]);
    res.json({ webhooks: rows });
  }),
);

webhooksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = webhookSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO webhooks (user_id, target_url, secret, active) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, data.target_url, data.secret ?? null, data.active],
    );
    res.status(201).json({ webhook: rows[0] });
  }),
);

webhooksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM webhooks WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id,
    ]);
    if (!rowCount) throw new ApiError(404, 'Webhook not found');
    res.json({ message: 'Webhook deleted' });
  }),
);
