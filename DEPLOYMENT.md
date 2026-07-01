# Deploying Dalili — Step-by-Step Guide 🚀

This guide walks you through putting the **Dalili Weather Alert System** (the React PWA client) online, from a clean build to a live, shareable URL with HTTPS.

**Good news:** Dalili is a static Vite build wired to the free, keyless **Open-Meteo** API, so it runs anywhere with **zero configuration** — no API keys, no server, no database needed for the live demo.

You only need to do **one** of the hosting options (Sections 3–6). Pick the one that fits.

---

## 0. Before you start — prerequisites

| You need | How to check / get it |
|---|---|
| **Node.js 18+** (20 LTS recommended) | Run `node -v`. Install from [nodejs.org](https://nodejs.org) if missing. |
| **The project** (`dalili-weather` folder) | Unzip `dalili-weather.zip` somewhere on your machine. |
| **A free host account** | Netlify, Vercel, Firebase, or GitHub — covered below. |
| **Git + GitHub** *(optional)* | Only needed for auto-deploy options. [Install Git](https://git-scm.com). |

---

## 1. Build and test locally first ✅

**Always verify the production build before deploying** — if it fails here, it will fail on the host too.

```bash
cd dalili-weather
npm install        # install dependencies (first time only)
npm run build      # compiles the app into a static /dist folder
npm run preview    # serves /dist at http://localhost:4173 so you can test it
```

While previewing, confirm:
- The app loads and you can complete **onboarding → role selection**.
- **Live weather appears** (real data for the chosen Kenyan town).
- The layout looks right on a phone — open the **Network:** URL that `npm run preview` prints, on a device on the same Wi-Fi.

If `npm run build` succeeds, the `dist/` folder is your deployable website. Everything below just puts that folder on the internet.

---

## 2. Choose where to host it

All four options below have a free tier that is more than enough for Dalili.

| Host | Best for | Difficulty |
|---|---|---|
| **Netlify** | Fastest possible deploy (drag & drop) | ⭐ Easiest |
| **Vercel** | Best developer experience for React | ⭐ Easy |
| **Firebase Hosting** | Fits your stack — your SRS already uses Firebase Cloud Messaging | ⭐⭐ Easy–Medium |
| **GitHub Pages** | Free, ideal for coursework / academic submission | ⭐⭐ Medium |

---

## 3. Option A — Netlify (recommended, easiest)

### A1 · Drag-and-drop (about 2 minutes)
1. Run `npm run build` to produce the `dist` folder.
2. Go to **[app.netlify.com](https://app.netlify.com)** and sign in.
3. Click **Add new site → Deploy manually**.
4. **Drag your `dist` folder** onto the drop zone.
5. Done — Netlify gives you a live URL like `dalili-honey.netlify.app`.

### A2 · Git-connected (auto-deploys on every push — recommended for a real project)
1. Push the project to GitHub (see the **Appendix** at the bottom).
2. On Netlify: **Add new site → Import an existing project → GitHub**, and select your repo.
3. Confirm the build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Click **Deploy**. From now on, every `git push` redeploys automatically.

> **Note on page refreshes:** Dalili is a single-page app that switches tabs with React state (no separate URLs per tab), so **no redirect rules are needed**. *If you later add React Router*, create a file `public/_redirects` containing the single line: `/*  /index.html  200`.

---

## 4. Option B — Vercel

### Via the website (easiest)
1. Push the project to GitHub (see the **Appendix**).
2. Go to **[vercel.com](https://vercel.com)** → **Add New… → Project** → import your repo.
3. Vercel **auto-detects Vite** — Framework Preset = *Vite*, Build = `npm run build`, Output = `dist`. Accept the defaults.
4. Click **Deploy** → live at `your-project.vercel.app`.

### Via the CLI (alternative)
```bash
npm i -g vercel       # install the Vercel CLI
vercel                # first run links/creates the project (follow the prompts)
vercel --prod         # promote the deployment to production
```

---

## 5. Option C — Firebase Hosting (fits your stack)

Because Dalili's design uses **Firebase Cloud Messaging** for push notifications, hosting on Firebase keeps your whole project in one console.

1. Install the CLI and sign in:
   ```bash
   npm i -g firebase-tools
   firebase login
   ```
2. From the project root, initialise hosting:
   ```bash
   firebase init hosting
   ```
   Answer the prompts as follows:
   - **Use an existing project** (or create a new one).
   - **Public directory:** `dist`
   - **Configure as a single-page app (rewrite all URLs to /index.html)?** → **Yes**
   - **Set up automatic builds with GitHub?** → optional (No is fine to start).
   - **Overwrite `dist/index.html`?** → **No** (if it asks).
3. Build, then deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```
4. Your app goes live at `your-project.web.app` (and `.firebaseapp.com`).

---

## 6. Option D — GitHub Pages (free, great for coursework)

GitHub Pages serves from a **sub-path** (`/your-repo-name/`), so two small changes are required.

1. In **`vite.config.js`**, add a `base` matching your repo name:
   ```js
   export default defineConfig({
     plugins: [react()],
     base: "/dalili-weather/",   // <-- your GitHub repo name, slashes included
   });
   ```
2. Install the deploy helper:
   ```bash
   npm i -D gh-pages
   ```
3. Add these two scripts to **`package.json`** (inside `"scripts"`):
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
4. Push the project to GitHub (see the **Appendix**), then run:
   ```bash
   npm run deploy
   ```
5. In your repo on GitHub: **Settings → Pages → Source = `gh-pages` branch**.
   Your app goes live at `https://<your-username>.github.io/dalili-weather/`.

> If you later switch to Netlify, Vercel, or Firebase (which all serve from the root), **set `base` back to `/`** in `vite.config.js`.

---

## 7. After deploying — quick checklist

- [ ] Open the live URL on **desktop** and on a **phone**.
- [ ] **Live weather loads** (Open-Meteo, no key required).
- [ ] Onboarding → role → every tab (Anga, Tahadhari, Mwenendo, Maeneo, Ushauri, Mipangilio) works.
- [ ] The padlock / **HTTPS** is active (all four hosts provide it automatically and free).
- [ ] Share the link 🎉

---

## 8. Add a custom domain (optional, professional touch)

On any of the four hosts the flow is the same:
1. Open your site's **Domain / Hosting settings** in the dashboard.
2. **Add a custom domain** (e.g. `dalili.nainchuhoney.co.ke` or your own).
3. At your domain registrar, add the **DNS record** the host shows you (usually a `CNAME`, or an `A` record for a root domain).
4. The host **provisions an HTTPS certificate automatically** once DNS propagates (minutes to a few hours).

---

## 9. Environment variables & API keys (when you go beyond the demo)

Dalili ships keyless. The moment you switch to a **keyed provider** (OpenWeatherMap / Tomorrow.io, per your SRS) or point at your own backend, handle secrets the Vite way:

- In code, read variables via `import.meta.env.VITE_API_BASE_URL` — **Vite only exposes variables prefixed with `VITE_`**.
- **Locally:** put them in a `.env` file in the project root (it is already in `.gitignore`):
  ```
  VITE_API_BASE_URL=https://api.yourbackend.com
  VITE_WEATHER_API_KEY=your_key_here
  ```
- **On the host:** add the same variables in the dashboard, then redeploy:
  - **Netlify:** Site configuration → Environment variables
  - **Vercel:** Project → Settings → Environment Variables
  - **Firebase:** set them at build time in your CI/CD
- **Never commit real keys** to GitHub.

---

## 10. Connecting the Django / PostgreSQL backend (next phase)

This guide deploys the **front-end**. For the complete Dalili system from your SRS:
1. Deploy the **Django REST Framework** API separately — good hosts: **Render**, **Railway**, **Fly.io**, or a VPS.
2. Enable **CORS** on the API for your front-end domain.
3. Set `VITE_API_BASE_URL` (Section 9) to the API's URL and redeploy the front-end.
4. Wire **Firebase Cloud Messaging** (push) and the **Africa's Talking** SMS gateway on the backend.

The front-end and backend are deployed and scaled independently — that separation is exactly the "industry standard" architecture your project is aiming for.

---

## Appendix — Push the project to GitHub (one time)

Needed for the Git-connected / auto-deploy options. Create an empty repo on GitHub first, then:

```bash
cd dalili-weather
git init
git add .
git commit -m "Initial commit: Dalili Weather Alert System"
git branch -M main
git remote add origin https://github.com/<your-username>/dalili-weather.git
git push -u origin main
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| **Blank white page** after deploying to **GitHub Pages** | The `base` in `vite.config.js` doesn't match your repo name. It must be `/your-repo-name/` with both slashes. |
| **404 when refreshing** a page | Only happens if you've added client-side routing. Add the SPA rewrite: Netlify `public/_redirects` (`/*  /index.html  200`), Firebase SPA = **Yes**, Vercel handles it automatically. |
| **Build works locally but fails on the host** | Usually a Node version mismatch. Set the host's Node version to **20**, or add an `engines` field / `.nvmrc` file specifying the version. |
| **Weather won't load** on the live site | Open the browser console (F12). Open-Meteo must be reachable over HTTPS — it is by default, so check for network/ad-blocker issues. |
| **An old version keeps showing** | Hard-refresh (`Ctrl/Cmd + Shift + R`), or clear the host's build cache and redeploy. |
| **Map shows the Kenya overview, not Google Maps** | No `VITE_GOOGLE_MAPS_API_KEY` set (or it's domain-restricted to the wrong host). Add it in the host's env settings and rebuild, or restrict the key to your live domain. |
| **SMS always shows "Failed (check backend)"** | The `/api/sms` backend isn't reachable. Deploy `server/` (below) and serve it same-origin, or point `VITE_SMS_ENDPOINT` at its URL. With no backend at all, the app simulates and labels messages accordingly. |

---

## 9. Environment variables (Maps & SMS)

The app runs with **zero config**, but two optional integrations use env vars.

**Front-end (build-time, public).** Set these in your host's *Environment
Variables* / *Build settings* (Netlify, Vercel, Firebase all support this), or in
a local `.env` (copy from `.env.example`). They are baked into the bundle at
build time, so **rebuild after changing them**:

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Enables the live Google Map. Restrict it to your domain(s). |
| `VITE_SMS_ENDPOINT` | SMS API URL. Defaults to `/api/sms`. |

> Only `VITE_`-prefixed values are exposed to the browser — never put the
> Africa's Talking secret here. That lives in the backend env below.

## 10. Deploying the SMS backend (Africa's Talking)

The browser can't call Africa's Talking directly (no CORS, secret key), so the
small Express service in `server/` does it. Deploy it and serve it same-origin at
`/api/sms` (or set `VITE_SMS_ENDPOINT` to its URL).

**Render / Railway / Fly.io (always-on Node service):**

1. Point the platform at the `server/` directory (root directory = `server`).
2. Build command `npm install`, start command `npm start`.
3. Add environment variables (from `server/.env.example`):
   `AT_USERNAME`, `AT_API_KEY` *(secret)*, `AT_SENDER_ID` *(optional)*,
   `AT_ENV` (`sandbox`/`live`), `SMS_PORT` (the platform usually sets `PORT` —
   keep `SMS_PORT` matching, or read `PORT`).
4. To keep it same-origin with the static site, either host both behind one
   domain (e.g. a reverse proxy / rewrite) or set `VITE_SMS_ENDPOINT` to the
   service's public URL and rebuild the front-end.

**Serverless alternative (Netlify / Vercel function):** port the handler in
`server/index.js` into a single function at `/api/sms` and set the same
`AT_*` variables as the function's environment. The front-end needs no change —
it already posts to `/api/sms`.

**Health check:** `GET /api/health` returns `{ ok, env, configured }` so you can
confirm the key is loaded without sending a message.

> Per the SRS, this relay can be replaced by the production **Django** SMS view —
> the front-end contract (`POST /api/sms` with `{ to, message }`) stays the same.

---

*Built for Kenyan skies. 🇰🇪 — "Bring Dalili to life, then put it online."*
