# Dalili — Weather Alert System 🌤️

> *Dalili* (Swahili: **"sign / indication"**) — read the signs in the sky.
> A hyperlocal, real-time weather alert application built for Kenya.
> Academic project **BAC-2202**.

Dalili delivers accurate, location-aware weather intelligence and contextual,
sector-specific advisories to Kenyan users — farmers, transporters, pilots,
hikers, event organizers, and businesses — so they can act *before* the weather
turns.

The app ships wired to **live weather data** via the free, keyless
[Open-Meteo API](https://open-meteo.com/), so it works the moment you run it —
no API key, no signup, no configuration. Accounts, Google Maps, and SMS are
**optional** layers you can switch on with a little setup (below).

---

## 🚀 Quick start

You need **Node.js 18+** and npm.

```bash
npm install      # install dependencies
npm run dev      # opens http://localhost:5173 automatically
```

The app launches at the **sign-in screen** → use the **demo account** button (or
register) → onboarding (detect/search your location, pick a role) → live dashboard.

> **Demo login:** `demo@dalili.ke` / `demo1234` — or just tap *"Try the demo account."*

### Other commands

```bash
npm run build     # production build into /dist
npm run preview   # preview the production build on http://localhost:4173
```

### Test it on your phone

`npm run dev` exposes the app on your local network (`host: true`). Vite prints a
**Network:** URL (e.g. `http://192.168.1.20:5173`) — open it on a phone on the
same Wi-Fi to feel the fully responsive, mobile-first GUI (bottom nav + drawer).

---

## ✨ What's inside

A complete, responsive single-page application implementing all nine SRS modules:

| Module | In the app | What it does |
|---|---|---|
| User Management | Sign-in + Onboarding + Settings | Account login, role/location setup, 7 roles, saved preferences |
| Geolocation | "Use my location" + town search | GPS reverse-geocoding + live Kenyan-town search (Open-Meteo geocoding), 16 built-in towns |
| Weather Aggregation | Live Open-Meteo feed | Current, hourly (24h) & 7-day forecast |
| Alert Processing | **Tahadhari** tab | Real threshold engine: storm, flash-flood, heavy rain, wind, heat, UV, visibility — 3 severity tiers |
| Notification Dispatch | **Arifa** tab | Browser push + **SMS number service** (Africa's Talking) with per-severity routing |
| Historical Data | **Mwenendo** tab | 7-day-back + 7-day-ahead temp & rainfall charts, Kenyan season awareness |
| Integration | Advisory engine | Sector-specific guidance from live conditions |
| Dashboard & Visualization | **Anga** tab | Living animated sky, metrics, forecasts |
| Map | **Maeneo** tab | **Google Maps** with location markers (or styled Kenya overview fallback) |

### Highlights

- **Sky-coded "Living Sky"** — a sky-blue / azure / sun-gold design system, with
  an animated hero that re-skins itself to the *actual* current conditions
  (sun, moon, clouds, rain, lightning, stars), respecting `prefers-reduced-motion`.
- **Accounts & saved data** — register / log in; your role, language, units,
  alert thresholds, saved places and SMS numbers persist across reloads.
- **SMS number service** — add Kenyan numbers (auto-normalized to `+254…`),
  verify, set a primary, and choose which alert severities trigger an SMS.
- **Google Maps** — live interactive map when a key is provided; graceful
  Kenya SVG fallback otherwise.
- **The "Dalili sign"** — reads imminent change in the live forecast and surfaces
  it as a single, plain-language signal.
- **Real, editable alert thresholds** — computed from live data, not hard-coded.
- **Bilingual** — full **English / Kiswahili** toggle across the entire UI.
- **Responsive** — desktop sidebar collapses to a mobile bottom-nav + drawer;
  fluid `clamp()` typography and auto-fitting grids, no fixed widths.

---

## ⚙️ Optional configuration (.env)

Everything above works with **zero config**. To enable Google Maps and real SMS,
copy the example env files and fill them in.

### Front-end (`.env` in the project root)

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key. Without it, the Map tab shows the styled Kenya overview. |
| `VITE_SMS_ENDPOINT` | Where SMS requests go. Defaults to `/api/sms`. Override only if your backend lives elsewhere. |

> ⚠️ Anything prefixed `VITE_` is **embedded in the browser bundle** and is
> therefore public. Put only publishable keys here — restrict your Maps key to
> your domains in the Google Cloud console. **Secrets live in `server/.env`.**

You can also paste a Maps key (and SMS endpoint) at runtime in **Settings** —
handy for quick testing without rebuilding. A per-user value overrides the env.

---

## 📲 The SMS backend (Africa's Talking)

The browser **cannot** call Africa's Talking directly — their API has no CORS
headers and needs a secret key — so SMS sends go through the small Express
service in `server/`.

```bash
cd server
cp .env.example .env        # then fill in your Africa's Talking credentials
npm install
npm start                   # listens on http://localhost:8787
```

`server/.env`:

| Variable | Purpose |
|---|---|
| `AT_USERNAME` | Africa's Talking username (`sandbox` while testing) |
| `AT_API_KEY` | Africa's Talking API key **(secret)** |
| `AT_SENDER_ID` | Optional registered short code / sender ID |
| `AT_ENV` | `sandbox` or `live` |
| `SMS_PORT` | Port (default `8787`, matches the Vite dev proxy) |

In dev, the front-end's `/api/sms` calls are **proxied** to this server
automatically (see `vite.config.js`). In production, deploy the server (or an
equivalent Django view / serverless function) and serve it same-origin at
`/api/sms`, or point `VITE_SMS_ENDPOINT` at its URL.

- **No backend running?** SMS is simulated and the in-app **Outbox** clearly
  marks each message as *Simulated* / *Sent* / *Failed* — nothing is hidden.
- Health check: `GET http://localhost:8787/api/health`.

---

## 🏗️ Architecture & stack

This repository is the **front-end web client** (React PWA tier of the Dalili
architecture) plus a minimal SMS relay.

```
dalili-weather/
├── index.html            # App shell, meta, theme color
├── vite.config.js        # Vite + React, LAN exposure, /api dev proxy
├── package.json          # Front-end scripts & pinned dependencies
├── .env.example          # Front-end (public) env template
├── public/
│   └── dalili-icon.svg    # App icon
├── src/
│   ├── main.jsx           # React entry point
│   ├── index.css          # Minimal global reset
│   └── App.jsx            # The full application (self-contained design system)
└── server/                # SMS backend (Africa's Talking)
    ├── index.js           # Express: POST /api/sms, GET /api/health
    ├── package.json
    └── .env.example       # Backend (secret) env template
```

- **Framework:** React 18 + Vite 5
- **Charts:** Recharts · **Icons:** lucide-react
- **Data:** Open-Meteo (live, keyless, CORS-enabled) — current, hourly, daily &
  historical; plus Open-Meteo geocoding + BigDataCloud reverse-geocoding for
  location search
- **Maps:** Google Maps JavaScript API (optional)
- **SMS:** Africa's Talking via the `server/` relay (optional)
- **Styling:** a self-contained design system injected by `App.jsx`
  (CSS variables + `dl-` prefixed classes) — fonts Bricolage Grotesque / Inter /
  IBM Plex Mono

### Design language

A "reading signs in the sky" direction, now **sky-coded**: a daylight-sky
palette of sky-blue (`#38BDF8`), azure (`#0284C7`) and sun-gold (`#FDB813`),
with a single living sky as the hero element that mirrors real conditions.

### A note on the demo auth

Accounts persist in **`localStorage`** for this academic build — simple and
self-contained. The data shape maps 1:1 to the User / Preference / Subscription
entities in the SRS, so moving authentication to **Firebase Auth** or the
**Django** backend is a localized change. *Never store plaintext passwords in a
production system.*

---

## 🔌 Connecting the full backend (next phase)

Per the SRS, the production system pairs this client with a **Django REST
Framework** API, **PostgreSQL** + **Redis**, **Firebase Cloud Messaging** for
push, and the **Africa's Talking** SMS gateway (the `server/` relay here is a
drop-in stand-in for that gateway integration). The live Open-Meteo calls can be
swapped for your backend's aggregated weather endpoints without touching the UI.

---

## 📦 Deploy

```bash
npm run build     # static bundle into /dist
```

Deploy `/dist` to Netlify, Vercel, Firebase Hosting, GitHub Pages, etc. To keep
SMS same-origin at `/api/sms`, deploy the `server/` service alongside (Render,
Railway, Fly.io, or as a serverless function) — see **DEPLOYMENT.md** for
step-by-step host instructions.

---

## 📝 Notes

- Weather data © [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).
- Pilot/aviation advisories are **situational awareness only** and are not a
  substitute for an official aviation weather briefing.

---

*Built for Kenyan skies. 🇰🇪*
