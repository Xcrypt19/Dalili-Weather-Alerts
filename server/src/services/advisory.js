import { query } from '../config/db.js';

/**
 * Contextual Advisory Module (FR-30..34).
 * Returns a role- and language-specific advisory string for a weather event.
 * Falls back to English, then to the general role, then a generic message.
 */
export async function getAdvisory(role, eventType, language = 'en') {
  const { rows } = await query(
    `SELECT role_type, language, message_text
       FROM advisory_content
      WHERE event_type = $1 AND active = TRUE
        AND role_type IN ($2, 'general')
        AND language IN ($3, 'en')`,
    [eventType, role, language],
  );
  if (!rows.length) return 'Stay alert and take appropriate precautions.';

  const score = (r) =>
    (r.role_type === role ? 2 : 0) + (r.language === language ? 1 : 0);
  rows.sort((a, b) => score(b) - score(a));
  return rows[0].message_text;
}
