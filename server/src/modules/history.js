import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { recordToday, backfillHistory } from '../services/history.js';

export const historyRouter = Router();
historyRouter.use(requireAuth);

async function ownLocation(userId, locationId) {
  const { rows } = await query('SELECT * FROM locations WHERE id = $1 AND user_id = $2', [
    locationId,
    userId,
  ]);
  return rows[0];
}

// Daily records for a location + date range (FR-35, FR-37: up to 3 years)
historyRouter.get(
  '/:locationId',
  asyncHandler(async (req, res) => {
    const loc = await ownLocation(req.user.id, req.params.locationId);
    if (!loc) throw new ApiError(404, 'Location not found');
    const from = req.query.from || '1900-01-01';
    const to = req.query.to || '2999-12-31';
    const { rows } = await query(
      `SELECT * FROM historical_weather
        WHERE location_id = $1 AND record_date BETWEEN $2 AND $3
        ORDER BY record_date ASC`,
      [loc.id, from, to],
    );
    res.json({ location: loc, records: rows });
  }),
);

// Monthly rollups + comparison with averages (FR-36)
historyRouter.get(
  '/:locationId/monthly',
  asyncHandler(async (req, res) => {
    const loc = await ownLocation(req.user.id, req.params.locationId);
    if (!loc) throw new ApiError(404, 'Location not found');
    const { rows } = await query(
      `SELECT to_char(date_trunc('month', record_date), 'YYYY-MM') AS month,
              ROUND(AVG(avg_temp)::numeric, 1) AS avg_temp,
              ROUND(MAX(max_temp)::numeric, 1) AS max_temp,
              ROUND(MIN(min_temp)::numeric, 1) AS min_temp,
              ROUND(SUM(total_rainfall)::numeric, 1) AS total_rainfall,
              ROUND(AVG(wind_speed)::numeric, 1) AS avg_wind
         FROM historical_weather
        WHERE location_id = $1
        GROUP BY 1 ORDER BY 1`,
      [loc.id],
    );
    res.json({ location: loc, months: rows });
  }),
);

// CSV export (FR-38)
historyRouter.get(
  '/:locationId/export',
  asyncHandler(async (req, res) => {
    const loc = await ownLocation(req.user.id, req.params.locationId);
    if (!loc) throw new ApiError(404, 'Location not found');
    const from = req.query.from || '1900-01-01';
    const to = req.query.to || '2999-12-31';
    const { rows } = await query(
      `SELECT record_date, avg_temp, max_temp, min_temp, total_rainfall, wind_speed
         FROM historical_weather
        WHERE location_id = $1 AND record_date BETWEEN $2 AND $3
        ORDER BY record_date ASC`,
      [loc.id, from, to],
    );
    const header = 'date,avg_temp,max_temp,min_temp,total_rainfall_mm,wind_speed\n';
    const body = rows
      .map(
        (r) =>
          `${r.record_date.toISOString().slice(0, 10)},${r.avg_temp ?? ''},${r.max_temp ?? ''},${r.min_temp ?? ''},${r.total_rainfall ?? ''},${r.wind_speed ?? ''}`,
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="dalili-history-${loc.name.replace(/\W+/g, '_')}.csv"`,
    );
    res.send(header + body);
  }),
);

// Record today's snapshot for a location (FR-35)
historyRouter.post(
  '/:locationId/record',
  asyncHandler(async (req, res) => {
    const loc = await ownLocation(req.user.id, req.params.locationId);
    if (!loc) throw new ApiError(404, 'Location not found');
    const record = await recordToday(loc);
    res.json({ record });
  }),
);

// Dev helper: backfill synthetic 3-year history so charts render (FR-37)
historyRouter.post(
  '/:locationId/backfill',
  asyncHandler(async (req, res) => {
    const loc = await ownLocation(req.user.id, req.params.locationId);
    if (!loc) throw new ApiError(404, 'Location not found');
    const days = Math.min(Number(req.body?.days) || 1095, 1095); // up to 3 yrs
    const count = await backfillHistory(loc, days);
    res.json({ message: `Backfilled ${count} daily records`, count });
  }),
);
