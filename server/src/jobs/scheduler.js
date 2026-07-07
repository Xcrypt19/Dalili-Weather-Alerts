import cron from 'node-cron';
import { env } from '../config/env.js';
import { processAllUsers } from '../services/alertProcessor.js';
import { query } from '../config/db.js';

/**
 * Background scheduler (SRS §5.3 + FR-13/FR-21).
 * - Polls weather & evaluates thresholds for all users on WEATHER_POLL_CRON.
 * - Records a daily history snapshot once per day at 23:30.
 */
export function startScheduler() {
  if (!cron.validate(env.weather.pollCron)) {
    console.warn('[scheduler] invalid WEATHER_POLL_CRON, using */10 * * * *');
  }
  const pollExpr = cron.validate(env.weather.pollCron) ? env.weather.pollCron : '*/10 * * * *';

  cron.schedule(pollExpr, async () => {
    try {
      const raised = await processAllUsers();
      if (raised) console.log(`[scheduler] poll complete — ${raised} alert(s) raised`);
    } catch (e) {
      console.error('[scheduler] poll failed:', e.message);
    }
  });

  // Daily history snapshot for every saved location.
  cron.schedule('30 23 * * *', async () => {
    try {
      const { rows } = await query('SELECT * FROM locations');
      const { recordToday } = await import('../services/history.js');
      for (const loc of rows) await recordToday(loc).catch(() => {});
      console.log(`[scheduler] recorded daily history for ${rows.length} locations`);
    } catch (e) {
      console.error('[scheduler] history snapshot failed:', e.message);
    }
  });

  console.log(`[scheduler] started (poll: ${pollExpr})`);
}
