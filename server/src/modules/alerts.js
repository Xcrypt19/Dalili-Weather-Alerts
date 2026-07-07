import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { DEFAULT_THRESHOLDS, PARAMETER_MAP } from '../services/alertEngine.js';
import { processUserLocation } from '../services/alertProcessor.js';

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

// ── Thresholds (FR-04) ────────────────────────────────────────────────
alertsRouter.get(
  '/thresholds',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      'SELECT * FROM alert_thresholds WHERE user_id = $1 ORDER BY parameter',
      [req.user.id],
    );
    res.json({ thresholds: rows, defaults: DEFAULT_THRESHOLDS, parameters: Object.keys(PARAMETER_MAP) });
  }),
);

const thresholdSchema = z.object({
  parameter: z.enum(Object.keys(PARAMETER_MAP)),
  comparator: z.enum(['gt', 'lt']).default('gt'),
  threshold_value: z.number(),
  unit: z.string().default(''),
  active: z.boolean().default(true),
});

// Upsert a threshold (FR-04)
alertsRouter.put(
  '/thresholds',
  asyncHandler(async (req, res) => {
    const data = thresholdSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO alert_thresholds (user_id, parameter, comparator, threshold_value, unit, active)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, parameter) DO UPDATE
         SET comparator = EXCLUDED.comparator,
             threshold_value = EXCLUDED.threshold_value,
             unit = EXCLUDED.unit,
             active = EXCLUDED.active
       RETURNING *`,
      [req.user.id, data.parameter, data.comparator, data.threshold_value, data.unit, data.active],
    );
    res.json({ threshold: rows[0] });
  }),
);

// Reset all thresholds to defaults (Use Case 3 alternative flow)
alertsRouter.post(
  '/thresholds/reset',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM alert_thresholds WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Thresholds reset to defaults', defaults: DEFAULT_THRESHOLDS });
  }),
);

alertsRouter.delete(
  '/thresholds/:parameter',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM alert_thresholds WHERE user_id = $1 AND parameter = $2', [
      req.user.id,
      req.params.parameter,
    ]);
    res.json({ message: 'Threshold removed' });
  }),
);

// ── Alert history (FR-43: last 30 days) ───────────────────────────────
alertsRouter.get(
  '/history',
  asyncHandler(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 30, 90);
    const { rows } = await query(
      `SELECT a.*, l.name AS location_name
         FROM alerts a LEFT JOIN locations l ON l.id = a.location_id
        WHERE a.user_id = $1 AND a.time_sent > now() - make_interval(days => $2::int)
        ORDER BY a.time_sent DESC`,
      [req.user.id, days],
    );
    res.json({ alerts: rows });
  }),
);

// ── Manual evaluation (test / on-demand) ──────────────────────────────
// Evaluates the user's primary (or given) location now and dispatches if crossed.
alertsRouter.post(
  '/evaluate',
  asyncHandler(async (req, res) => {
    let locationId = req.body?.locationId;
    if (!locationId) {
      const { rows } = await query(
        'SELECT id FROM locations WHERE user_id = $1 ORDER BY is_primary DESC LIMIT 1',
        [req.user.id],
      );
      locationId = rows[0]?.id;
    }
    if (!locationId) throw new ApiError(400, 'No saved location to evaluate');
    const result = await processUserLocation(req.user.id, locationId);
    res.json(result);
  }),
);
