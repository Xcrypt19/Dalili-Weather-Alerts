import { query } from '../config/db.js';
import { sendPush } from './push.js';
import { sendSms } from './sms.js';
import { sendEmail } from './email.js';

/**
 * Notification Dispatch Module (FR-25..29).
 * Channel rules:
 *   - Push first (if enabled + token present).
 *   - SMS is a first-class channel (FR-26): sent whenever the user has
 *     enabled it and verified their number — most Kenyan users are reached
 *     this way, so it does not wait for push to fail.
 *   - Email sent additionally when the user has opted in (FR-27).
 * Every attempt is recorded in notification_log (FR-28 tracking).
 */
async function log(alertId, channel, result) {
  await query(
    `INSERT INTO notification_log (alert_id, channel, status, detail, time_delivered)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      alertId,
      channel,
      result.skipped ? 'skipped' : result.ok ? 'delivered' : 'failed',
      result.detail || null,
      result.ok ? new Date() : null,
    ],
  );
}

export async function dispatchAlert(user, alert) {
  const title = `${severityLabel(alert.severity)}: ${alert.label || alert.alert_type}`;
  const body = `${alert.message_text}${alert.advice_text ? `\n${alert.advice_text}` : ''}`;
  const channels = [];

  // 1. Push (FR-25)
  if (user.push_enabled && user.fcm_token) {
    const r = await sendPush(user.fcm_token, {
      title,
      body,
      data: { alertId: alert.id, type: alert.alert_type, severity: alert.severity },
    });
    await log(alert.id, 'push', r);
    channels.push({ channel: 'push', ...r });
  } else {
    await log(alert.id, 'push', { skipped: true, detail: 'push disabled or no device token' });
  }

  // 2. SMS (FR-26) — only to numbers the user has proven they own.
  if (user.sms_enabled && user.phone) {
    if (user.phone_verified) {
      const r = await sendSms(user.phone, smsBody(title, alert));
      await log(alert.id, 'sms', r);
      channels.push({ channel: 'sms', ...r });
    } else {
      await log(alert.id, 'sms', { skipped: true, detail: 'phone not verified — verify in Settings' });
    }
  }

  // 3. Email (FR-27) — additional channel, opt-in.
  if (user.email_enabled && user.email) {
    const r = await sendEmail(user.email, `Dalili — ${title}`, body, emailHtml(title, alert));
    await log(alert.id, 'email', r);
    channels.push({ channel: 'email', ...r });
  }

  return channels;
}

// Keep texts within two GSM segments (~306 chars) so they arrive as one message.
function smsBody(title, alert) {
  const text = `Dalili ${title}\n${alert.message_text}${alert.advice_text ? `\n${alert.advice_text}` : ''}`;
  return text.length > 300 ? `${text.slice(0, 297)}…` : text;
}

function severityLabel(s) {
  return { advisory: 'Advisory', watch: 'Watch', warning: 'Warning', emergency: 'EMERGENCY' }[s] || s;
}

function emailHtml(title, alert) {
  return `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px">
    <h2 style="color:#0b6cb0;margin:0 0 8px">${title}</h2>
    <p style="font-size:15px;color:#1f2a37">${alert.message_text}</p>
    ${alert.advice_text ? `<p style="background:#eaf4fb;border-left:4px solid #f6b53a;padding:10px 14px;border-radius:6px"><strong>Advice:</strong> ${alert.advice_text}</p>` : ''}
    <p style="font-size:12px;color:#6b7280">Sent by Dalili Weather · ${new Date(alert.time_sent || Date.now()).toLocaleString()}</p>
  </div>`;
}
