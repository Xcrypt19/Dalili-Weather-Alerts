import { env, hasKey } from '../config/env.js';

/**
 * Push notifications via Firebase Cloud Messaging (FR-25).
 * Uses the FCM HTTP legacy endpoint with a server key for simplicity.
 * Returns { ok, detail }.
 */
export async function sendPush(fcmToken, { title, body, data }) {
  if (!fcmToken) return { ok: false, detail: 'no device token' };
  if (!hasKey(env.fcmServerKey)) {
    console.log(`[push:mock] -> ${fcmToken.slice(0, 12)}…: ${title} — ${body}`);
    return { ok: false, detail: 'fcm not configured (logged only)' };
  }
  try {
    const r = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${env.fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: fcmToken,
        notification: { title, body },
        data: data || {},
      }),
    });
    const json = await r.json();
    const ok = (json.success || 0) > 0;
    return { ok, detail: ok ? 'fcm delivered' : JSON.stringify(json.results || json) };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}
