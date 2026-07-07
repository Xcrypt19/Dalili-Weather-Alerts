/**
 * Normalize a Kenyan phone number to E.164 (+254XXXXXXXXX) so any of the
 * forms people actually type — 0712 345 678, 0112..., 712345678, 254712...,
 * +254712... — resolve to the same account and are deliverable by the SMS
 * gateways (Africa's Talking / Twilio both require E.164).
 * Non-Kenyan numbers already in +E.164 form pass through unchanged.
 * Returns null when the input can't be understood as a phone number.
 */
export function normalizePhone(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[\s\-().]/g, '');
  if (/^\+254[71]\d{8}$/.test(s)) return s;
  if (/^254[71]\d{8}$/.test(s)) return `+${s}`;
  if (/^0[71]\d{8}$/.test(s)) return `+254${s.slice(1)}`;
  if (/^[71]\d{8}$/.test(s)) return `+254${s}`;
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s; // other international numbers
  return null;
}
