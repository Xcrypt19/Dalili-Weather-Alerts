import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { reverseGeocode, forwardGeocode } from '../services/geocode.js';

export const locationsRouter = Router();
locationsRouter.use(requireAuth);

const locationSchema = z.object({
  name: z.string().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  county: z.string().optional(),
  sub_county: z.string().optional(),
  ward: z.string().optional(),
  place_label: z.string().max(160).optional(),
  is_primary: z.boolean().optional(),
});

// List saved locations (FR-05)
locationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      'SELECT * FROM locations WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
      [req.user.id],
    );
    res.json({ locations: rows });
  }),
);

// Create a saved location (FR-05, FR-10 manual entry)
locationsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = locationSchema.parse(req.body);
    // Resolve the precise place via geocoding when not supplied (FR-09) —
    // estate/road/ward level, not just the county.
    let { county, sub_county, ward, place_label } = data;
    if (!place_label || !county) {
      const place = await reverseGeocode(data.latitude, data.longitude);
      place_label = place_label || place?.precise || place?.formatted || null;
      county = county || place?.county || null;
      sub_county = sub_county || place?.subCounty || null;
      ward = ward || place?.ward || null;
    }
    const location = await withTransaction(async (client) => {
      if (data.is_primary) {
        await client.query('UPDATE locations SET is_primary = FALSE WHERE user_id = $1', [
          req.user.id,
        ]);
      }
      // First location becomes primary automatically.
      const count = await client.query('SELECT COUNT(*)::int AS n FROM locations WHERE user_id=$1', [
        req.user.id,
      ]);
      const makePrimary = data.is_primary || count.rows[0].n === 0;
      const { rows } = await client.query(
        `INSERT INTO locations (user_id, name, latitude, longitude, county, sub_county, ward, place_label, is_primary)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [req.user.id, data.name, data.latitude, data.longitude, county, sub_county, ward, place_label, makePrimary],
      );
      return rows[0];
    });
    res.status(201).json({ location });
  }),
);

// Update a location
locationsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = locationSchema.partial().parse(req.body);
    const keys = Object.keys(data);
    if (!keys.length) throw new ApiError(400, 'No fields to update');
    const location = await withTransaction(async (client) => {
      if (data.is_primary) {
        await client.query('UPDATE locations SET is_primary = FALSE WHERE user_id = $1', [
          req.user.id,
        ]);
      }
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const values = keys.map((k) => data[k]);
      values.push(req.params.id, req.user.id);
      const { rows } = await client.query(
        `UPDATE locations SET ${sets.join(', ')}
         WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
        values,
      );
      return rows[0];
    });
    if (!location) throw new ApiError(404, 'Location not found');
    res.json({ location });
  }),
);

// Delete a location
locationsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM locations WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id,
    ]);
    if (!rowCount) throw new ApiError(404, 'Location not found');
    res.json({ message: 'Location deleted' });
  }),
);

// Reverse geocode helper (FR-09): coords -> place name
locationsRouter.get(
  '/geocode/reverse',
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw new ApiError(400, 'lat and lng required');
    res.json({ place: await reverseGeocode(lat, lng) });
  }),
);

// Forward geocode helper (FR-10): place name -> coords
locationsRouter.get(
  '/geocode/forward',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) throw new ApiError(400, 'q required');
    res.json({ results: await forwardGeocode(q) });
  }),
);
