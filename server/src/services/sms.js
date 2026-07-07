import { env, hasKey } from '../config/env.js';

/**
 * SMS fallback service (FR-26, SRS §5.2 "Africa's Talking or Twilio").
 * Sends a text message to a phone number. Returns { ok, detail }.
 * Degrades to a logged no-op when no provider is configured, so the rest of
 * the pipeline (notification_log) still records a meaningful status.
 */
export async function sendSms(toNumber, body) {
  if (!toNumber) return { ok: false, detail: 'no phone number on file' };

  const provider = env.sms.provider;
  try {
    if (provider === 'twilio' && hasKey(env.sms.twilio.sid)) {
      return await viaTwilio(toNumber, body);
    }
    if (provider === 'africastalking' && hasKey(env.sms.africasTalking.apiKey)) {
      return await viaAfricasTalking(toNumber, body);
    }
  } catch (e) {
    return { ok: false, detail: e.message };
  }
  // No provider configured — log so developers can see the SMS that would send.
  console.log(`[sms:mock] -> ${toNumber}: ${body}`);
  return { ok: false, detail: 'sms provider not configured (logged only)' };
}

// ── Twilio ────────────────────────────────────────────────────────────
async function viaTwilio(to, body) {
  const { sid, token, from } = env.sms.twilio;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const data = await r.json();
  if (!r.ok) return { ok: false, detail: data.message || `twilio ${r.status}` };
  return { ok: true, detail: `twilio sid ${data.sid}` };
}

// ── Africa's Talking ──────────────────────────────────────────────────
async function viaAfricasTalking(to, body) {
  const { username, apiKey, senderId } = env.sms.africasTalking;
  const url = 'https://api.africastalking.com/version1/messaging';
  const params = new URLSearchParams({ username, to, message: body });
  if (hasKey(senderId)) params.set('from', senderId);
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params,
  });
  const data = await r.json();
  const recipients = data?.SMSMessageData?.Recipients || [];
  const ok = recipients.some((x) => x.status === 'Success');
  return { ok, detail: data?.SMSMessageData?.Message || `africastalking ${r.status}` };
}
