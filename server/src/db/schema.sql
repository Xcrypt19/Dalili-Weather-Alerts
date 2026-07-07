-- Dalili Weather — PostgreSQL schema (SRS §10.1)
-- Safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ── Users (FR-01..07) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  password_hash TEXT,                        -- null for OAuth/guest
  role          TEXT NOT NULL DEFAULT 'general'
                CHECK (role IN ('farmer','business','pilot','general')),
  language      TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','sw')),
  is_guest      BOOLEAN NOT NULL DEFAULT FALSE,
  -- channel preferences (FR-29)
  push_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  -- quiet hours (FR-24): integers 0-23, null = disabled
  quiet_start   SMALLINT,
  quiet_end     SMALLINT,
  fcm_token     TEXT,
  -- SMS onboarding (FR-26): number is verified by OTP before we text it
  phone_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  phone_otp_hash       TEXT,
  phone_otp_expires_at TIMESTAMPTZ,
  reset_token       TEXT,
  reset_expires_at  TIMESTAMPTZ,
  date_joined   TIMESTAMPTZ NOT NULL DEFAULT now(),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT users_identity CHECK (email IS NOT NULL OR phone IS NOT NULL OR is_guest)
);

-- ── Locations (FR-05, FR-08..12) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                 -- e.g. 'My Farm'
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  county      TEXT,                           -- county (kept for grouping)
  sub_county  TEXT,
  ward        TEXT,
  place_label TEXT,                           -- hyper-specific: estate/road/ward, e.g. "Kahawa Wendani, Ruiru, Kiambu"
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_locations_user ON locations(user_id);

-- ── Alert thresholds (FR-04) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_thresholds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parameter       TEXT NOT NULL,             -- rain_probability, wind_speed, temperature, ...
  comparator      TEXT NOT NULL DEFAULT 'gt' CHECK (comparator IN ('gt','lt')),
  threshold_value DOUBLE PRECISION NOT NULL,
  unit            TEXT NOT NULL DEFAULT '',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, parameter)
);

-- ── Alerts (FR-19..23, FR-43) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id   UUID REFERENCES locations(id) ON DELETE SET NULL,
  alert_type    TEXT NOT NULL,               -- rain, storm, flash_flood, high_wind, heat, fog
  severity      TEXT NOT NULL CHECK (severity IN ('advisory','watch','warning','emergency')),
  parameter     TEXT,
  trigger_value DOUBLE PRECISION,
  message_text  TEXT NOT NULL,
  advice_text   TEXT,
  time_sent     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alerts_user_time ON alerts(user_id, time_sent DESC);

-- ── Notification log (FR-25..28) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id      UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('push','sms','email')),
  status        TEXT NOT NULL CHECK (status IN ('sent','delivered','failed','skipped')),
  detail        TEXT,
  time_sent     TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_delivered TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notiflog_alert ON notification_log(alert_id);

-- ── Historical weather (FR-35..38) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS historical_weather (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  record_date   DATE NOT NULL,
  avg_temp      DOUBLE PRECISION,
  max_temp      DOUBLE PRECISION,
  min_temp      DOUBLE PRECISION,
  total_rainfall DOUBLE PRECISION,
  wind_speed    DOUBLE PRECISION,
  UNIQUE (location_id, record_date)
);
CREATE INDEX IF NOT EXISTS idx_hist_loc_date ON historical_weather(location_id, record_date);

-- ── Advisory content (FR-30..34) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisory_content (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_type   TEXT NOT NULL CHECK (role_type IN ('farmer','business','pilot','general')),
  event_type  TEXT NOT NULL,                 -- rain, storm, flash_flood, high_wind, heat, fog
  language    TEXT NOT NULL CHECK (language IN ('en','sw')),
  message_text TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (role_type, event_type, language)
);

-- ── Webhooks for third-party integration (FR-45) ──────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_url  TEXT NOT NULL,
  secret      TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Dedup ledger (FR-23): last time an (user,type) alert fired ────────
CREATE TABLE IF NOT EXISTS alert_dedup (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  last_fired TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, alert_type)
);

-- ── Idempotent upgrades for databases created before these columns ────
ALTER TABLE users     ADD COLUMN IF NOT EXISTS phone_verified       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users     ADD COLUMN IF NOT EXISTS phone_otp_hash       TEXT;
ALTER TABLE users     ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMPTZ;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS sub_county  TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS ward        TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS place_label TEXT;
