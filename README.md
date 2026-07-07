# Dalili — Weather Alert Application

> *Dalili* — the Swahili word for *sign* / *indication*.

A full-stack, responsive weather-alert web application that delivers **hyperlocal**
weather alerts with **role-based practical advice** (farmers, business/transport,
pilots, general public), built to the *Dalili SRS v2* specification.

This repository implements the SRS as a **web application + Node/Express REST API +
PostgreSQL** (the SRS lists Flutter/Django as one possible stack; this implementation
uses the requested React + Node + Postgres stack and covers all 45 functional
requirements).

---

## Feature coverage (SRS Functional Requirements)

| Area | Requirements | Status |
|------|--------------|--------|
| User accounts (email/phone signup, JWT, roles, thresholds, saved locations, password reset, guest mode) | FR-01 … FR-07 | ✅ |
| Location (high-accuracy GPS with refined fix, hyper-local geocoding to estate/road/ward level, manual entry, interactive map, graceful denial) | FR-08 … FR-12 | ✅ |
| Weather data (Tomorrow.io primary, OpenWeatherMap backup, all params, caching, auto-failover, history) | FR-13 … FR-18 | ✅ |
| Alerts (threshold engine, 4 severities, <2 min dispatch, 6 alert types, 60-min dedup, quiet hours) | FR-19 … FR-24 | ✅ |
| Notifications (FCM push, SMS alerts to verified Kenyan numbers with OTP onboarding, email opt-in, rich content, channel choice) | FR-25 … FR-29 | ✅ |
| Contextual advice (role-based, farmer/business/pilot, EN + Swahili) | FR-30 … FR-34 | ✅ |
| Historical data (daily records, monthly/seasonal trends, 3-yr lookback, CSV export) | FR-35 … FR-38 | ✅ |
| Dashboard & maps (current, 24-h hourly, 7-day, radar on Google Maps, 30-day alert history) | FR-39 … FR-43 | ✅ |
| Third-party integration (public REST API, webhooks) | FR-44 … FR-45 | ✅ |

Non-functional: HTTPS-ready, bcrypt hashing, 1-hour JWT + refresh, Redis-optional
caching, WebSocket live updates, Docker, WCAG-AA-minded sky theme, EN/SW i18n.

---

## Project layout

```
dalili-weather/
├── server/            Node/Express + PostgreSQL API
│   ├── src/
│   │   ├── config/        env + db pool + cache
│   │   ├── db/            schema.sql, seed.sql, migrate.js
│   │   ├── middleware/    auth, error handling
│   │   ├── modules/       users, locations, weather, alerts, advisory,
│   │   │                  notifications, history, dashboard, integration
│   │   ├── services/      tomorrow.io, openweather, geocode, fcm, sms, email
│   │   ├── jobs/          scheduler (weather poll + alert evaluation)
│   │   ├── realtime/      websocket hub
│   │   └── server.js
│   └── package.json
├── client/            React (Vite) PWA — sky/sun/cloud theme, fully responsive
│   ├── src/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Quick start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use Docker)
- (optional) Redis — falls back to in-memory cache if absent

### 2. Configure environment
```bash
cd server
cp .env.example .env
# edit .env and fill in your API keys (Google Maps, Tomorrow.io, etc.)
```

### 3. Run with Docker (easiest)
```bash
docker compose up --build
```
API → http://localhost:4000  ·  Web → http://localhost:5173

### 4. Run manually
```bash
# terminal 1 — database must be running, then:
cd server
npm install
npm run migrate        # creates tables + seeds advisory content
npm run dev            # http://localhost:4000

# terminal 2
cd client
npm install
# create client/.env with VITE_GOOGLE_MAPS_API_KEY=...  (see client/.env.example)
npm run dev            # http://localhost:5173
```

## Required API keys (placeholders in `.env`)

| Key | Where to get it | Used for |
|-----|-----------------|----------|
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → Maps Platform | Geocoding, maps, radar overlay |
| `TOMORROW_API_KEY` | tomorrow.io | Primary weather data |
| `OPENWEATHER_API_KEY` | openweathermap.org | Backup weather data |
| `AT_*` *or* `TWILIO_*` | Africa's Talking (recommended for Kenya — free sandbox, KES billing) / Twilio | SMS alerts + phone verification codes |
| `FCM_SERVER_KEY` | Firebase console | Push notifications |
| `SMTP_*` | any SMTP provider | Email notifications |

The app runs without real keys — services degrade gracefully (mock data / logged
notifications) so you can develop the UI before wiring providers.
