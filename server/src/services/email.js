import nodemailer from 'nodemailer';
import { env, hasKey } from '../config/env.js';

/**
 * Email notifications (FR-27, opt-in). Returns { ok, detail }.
 * No-op (logged) when SMTP is not configured.
 */
let transporter = null;
if (hasKey(env.smtp.host)) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: hasKey(env.smtp.user) ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
}

export async function sendEmail(to, subject, text, html) {
  if (!to) return { ok: false, detail: 'no email on file' };
  if (!transporter) {
    console.log(`[email:mock] -> ${to}: ${subject}`);
    return { ok: false, detail: 'smtp not configured (logged only)' };
  }
  try {
    const info = await transporter.sendMail({ from: env.smtp.from, to, subject, text, html });
    return { ok: true, detail: `smtp ${info.messageId}` };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}
