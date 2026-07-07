import crypto from 'node:crypto';
import { query } from '../config/db.js';

/**
 * Third-party webhooks (FR-45). When an alert is raised, POST it to every
 * registered, active webhook for that user with an HMAC signature header.
 */
export async function fireWebhooks(userId, alert) {
  const { rows } = await query(
    'SELECT * FROM webhooks WHERE user_id = $1 AND active = TRUE',
    [userId],
  );
  await Promise.all(
    rows.map(async (hook) => {
      const payload = JSON.stringify({
        event: 'alert.raised',
        alert: {
          id: alert.id,
          type: alert.alert_type,
          severity: alert.severity,
          message: alert.message_text,
          advice: alert.advice_text,
          time_sent: alert.time_sent,
        },
      });
      const headers = { 'Content-Type': 'application/json' };
      if (hook.secret) {
        headers['X-Dalili-Signature'] = crypto
          .createHmac('sha256', hook.secret)
          .update(payload)
          .digest('hex');
      }
      try {
        await fetch(hook.target_url, { method: 'POST', headers, body: payload });
      } catch (e) {
        console.warn(`[webhook] ${hook.target_url} failed:`, e.message);
      }
    }),
  );
}
