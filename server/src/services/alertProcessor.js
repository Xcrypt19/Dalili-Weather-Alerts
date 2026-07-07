import { query } from '../config/db.js';
import { getWeather } from './weather.js';
import { getAdvisory } from './advisory.js';
import { dispatchAlert } from './dispatcher.js';
import { evaluate, inQuietHours, formatMessage } from './alertEngine.js';
import { publishToUser } from '../realtime/hub.js';
import { fireWebhooks } from './webhooks.js';

const DEDUP_MINUTES = 60; // FR-23

/**
 * Evaluate one user's location, raise + dispatch any new alerts.
 * Used by the scheduler (FR-21 timeliness) and the manual /evaluate endpoint.
 */
export async function processUserLocation(userId, locationId) {
  const userRes = await query('SELECT * FROM users WHERE id = $1 AND active = TRUE', [userId]);
  const user = userRes.rows[0];
  if (!user) return { raised: [], reason: 'user inactive' };

  const locRes = await query('SELECT * FROM locations WHERE id = $1 AND user_id = $2', [
    locationId,
    userId,
  ]);
  const location = locRes.rows[0];
  if (!location) return { raised: [], reason: 'location not found' };

  const thrRes = await query('SELECT * FROM alert_thresholds WHERE user_id = $1', [userId]);
  const weather = await getWeather(location.latitude, location.longitude);

  const candidates = evaluate(weather, thrRes.rows);
  const raised = [];

  for (const c of candidates) {
    // Quiet hours (FR-24): suppress all but emergencies.
    if (c.severity !== 'emergency' && inQuietHours(user)) {
      continue;
    }
    // Dedup (FR-23): skip if same type fired within the window.
    const dedup = await query(
      `SELECT last_fired FROM alert_dedup WHERE user_id = $1 AND alert_type = $2`,
      [userId, c.alert_type],
    );
    const last = dedup.rows[0]?.last_fired;
    if (last && Date.now() - new Date(last).getTime() < DEDUP_MINUTES * 60_000) {
      continue;
    }

    const advice = await getAdvisory(user.role, c.event, user.language);
    // Prefer the hyper-specific label ("Kahawa Wendani, Ruiru, Kiambu") over the county.
    const message = formatMessage(c, location.place_label || location.name || location.county);

    const ins = await query(
      `INSERT INTO alerts (user_id, location_id, alert_type, severity, parameter, trigger_value, message_text, advice_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, locationId, c.alert_type, c.severity, c.parameter, c.trigger_value, message, advice],
    );
    const alert = { ...ins.rows[0], label: c.label };

    await query(
      `INSERT INTO alert_dedup (user_id, alert_type, last_fired) VALUES ($1,$2, now())
       ON CONFLICT (user_id, alert_type) DO UPDATE SET last_fired = now()`,
      [userId, c.alert_type],
    );

    const channels = await dispatchAlert(user, alert);
    publishToUser(userId, { kind: 'alert', alert });
    fireWebhooks(userId, alert).catch((e) => console.warn('[webhook]', e.message));

    raised.push({ ...alert, channels });
  }

  return { raised, evaluated: candidates.length, source: weather.source };
}

/** Sweep every active user's locations (scheduler entry point). */
export async function processAllUsers() {
  const { rows } = await query(
    `SELECT l.id AS location_id, l.user_id
       FROM locations l JOIN users u ON u.id = l.user_id
      WHERE u.active = TRUE AND u.is_guest = FALSE`,
  );
  let total = 0;
  for (const row of rows) {
    try {
      const r = await processUserLocation(row.user_id, row.location_id);
      total += r.raised?.length || 0;
    } catch (e) {
      console.warn('[scheduler] processUserLocation failed:', e.message);
    }
  }
  return total;
}
