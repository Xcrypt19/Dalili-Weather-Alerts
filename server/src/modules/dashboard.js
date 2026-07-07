import { Router } from 'express';
import { query } from '../config/db.js';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { getWeather } from '../services/weather.js';
import { env, hasKey } from '../config/env.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

/**
 * Dashboard bundle (FR-39..43): current conditions, 24h hourly, 7-day forecast,
 * recent alert history and the radar overlay configuration for Google Maps.
 */
dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const locRes = await query(
      'SELECT * FROM locations WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
      [req.user.id],
    );
    const locations = locRes.rows;

    // Active location = explicit ?locationId, else primary, else lat/lng query.
    let active = null;
    if (req.query.locationId) active = locations.find((l) => l.id === req.query.locationId);
    if (!active) active = locations[0];

    let lat;
    let lng;
    if (active) {
      lat = active.latitude;
      lng = active.longitude;
    } else if (req.query.lat && req.query.lng) {
      lat = Number(req.query.lat);
      lng = Number(req.query.lng);
    }

    let weather = null;
    if (lat != null && lng != null) weather = await getWeather(lat, lng);

    const alertsRes = await query(
      `SELECT a.*, l.name AS location_name
         FROM alerts a LEFT JOIN locations l ON l.id = a.location_id
        WHERE a.user_id = $1
        ORDER BY a.time_sent DESC LIMIT 10`,
      [req.user.id],
    );

    res.json({
      activeLocation: active || (lat != null ? { latitude: lat, longitude: lng } : null),
      locations,
      weather,
      recentAlerts: alertsRes.rows,
      radar: radarConfig(),
    });
  }),
);

/**
 * Radar / precipitation tile layer to overlay on Google Maps (FR-42).
 * OpenWeatherMap tile layers are XYZ tiles that Google Maps can render via an
 * ImageMapType. Returns null if no key, so the client shows the map without radar.
 */
function radarConfig() {
  if (!hasKey(env.weather.openWeatherKey)) return { available: false };
  return {
    available: true,
    // {z}/{x}/{y} XYZ template; layers: precipitation_new, clouds_new, wind_new, temp_new
    tileUrlTemplate: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${env.weather.openWeatherKey}`,
    layers: ['precipitation_new', 'clouds_new', 'wind_new', 'temp_new'],
    attribution: 'OpenWeatherMap',
  };
}
