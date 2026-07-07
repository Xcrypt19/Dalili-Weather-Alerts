import { query } from '../config/db.js';
import { getWeather } from './weather.js';

/**
 * Historical Data Module (FR-35..38).
 * Records a daily snapshot per saved location. Real deployments would also
 * ingest NOAA / Kenya Met Department archives (FR-18); a synthetic backfill is
 * provided so trend charts work in development.
 */
export async function recordToday(location) {
  const wx = await getWeather(location.latitude, location.longitude);
  const c = wx.current || {};
  const today = wx.daily?.[0] || {};
  const { rows } = await query(
    `INSERT INTO historical_weather
       (location_id, record_date, avg_temp, max_temp, min_temp, total_rainfall, wind_speed)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
     ON CONFLICT (location_id, record_date) DO UPDATE
       SET avg_temp = EXCLUDED.avg_temp, max_temp = EXCLUDED.max_temp,
           min_temp = EXCLUDED.min_temp, total_rainfall = EXCLUDED.total_rainfall,
           wind_speed = EXCLUDED.wind_speed
     RETURNING *`,
    [
      location.id,
      c.temperature ?? null,
      today.tempMax ?? c.temperature ?? null,
      today.tempMin ?? null,
      c.rainfall ?? today.rainfall ?? 0,
      c.windSpeed ?? null,
    ],
  );
  return rows[0];
}

export async function backfillHistory(location, days) {
  const seed = Math.abs(Math.sin(location.latitude * location.longitude));
  const wind = +(8 + seed * 6).toFixed(1);

  // Build one synthetic record per day.
  const rows = [];
  for (let d = 0; d < days; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    // Kenya bimodal rainfall: long rains Mar–May, short rains Oct–Dec.
    const wet = [2, 3, 4, 9, 10, 11].includes(date.getMonth());
    const base = 16 + seed * 8 + Math.sin(d / 30) * 3;
    const rain = wet ? Math.max(0, seed * 20 + Math.sin(d) * 10) : Math.max(0, seed * 3);
    rows.push([
      location.id,
      date.toISOString().slice(0, 10),
      +base.toFixed(1),
      +(base + 6).toFixed(1),
      +(base - 5).toFixed(1),
      +rain.toFixed(1),
      wind,
    ]);
  }

  // Insert in chunks to stay under the parameter limit (7 params/row).
  let inserted = 0;
  const CHUNK = 200;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const slice = rows.slice(start, start + CHUNK);
    const params = slice.flat();
    const placeholders = slice
      .map((_, i) => {
        const b = i * 7;
        return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7})`;
      })
      .join(',');
    await query(
      `INSERT INTO historical_weather
         (location_id, record_date, avg_temp, max_temp, min_temp, total_rainfall, wind_speed)
       VALUES ${placeholders}
       ON CONFLICT (location_id, record_date) DO NOTHING`,
      params,
    );
    inserted += slice.length;
  }
  return inserted;
}
