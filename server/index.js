/**
 * Dalili — SMS backend (Africa's Talking)
 * --------------------------------------------------------------------------
 * A tiny Express service that the front-end calls at POST /api/sms.
 * It forwards the message to Africa's Talking using your account credentials,
 * which are read from environment variables and NEVER exposed to the browser.
 *
 * The browser cannot call Africa's Talking directly: their API has no CORS
 * headers and requires a secret API key, so all sends must go through a server
 * like this one (or an equivalent Django view / serverless function).
 *
 * Run:   cd server && npm install && npm start
 * Env:   see server/.env.example
 * Node:  18+ (uses the built-in global fetch)
 */
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

const {
  AT_USERNAME = "sandbox",
  AT_API_KEY = "",              // SECRET — set in server/.env or the host's env vars, never in code
  AT_SENDER_ID = "",            // optional short code / alphanumeric sender id
  AT_ENV = "sandbox",           // "sandbox" | "live"
} = process.env;

// Render (and most PaaS) inject PORT and expect the app to bind to it.
// Fall back to SMS_PORT locally, then 8787.
const PORT = process.env.PORT || process.env.SMS_PORT || "8787";

const AT_HOST =
  AT_ENV === "live"
    ? "https://api.africastalking.com/version1/messaging"
    : "https://api.sandbox.africastalking.com/version1/messaging";

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "dalili-sms",
    env: AT_ENV,
    configured: Boolean(AT_API_KEY),
    username: AT_USERNAME,
  });
});

app.post("/api/sms", async (req, res) => {
  try {
    const { to, message } = req.body || {};
    if (!to || !message) {
      return res.status(400).json({ ok: false, error: "Both 'to' and 'message' are required." });
    }
    if (!AT_API_KEY) {
      return res.status(503).json({
        ok: false,
        error: "SMS backend not configured. Set AT_API_KEY in server/.env.",
      });
    }

    const recipients = Array.isArray(to) ? to.join(",") : String(to);
    const params = new URLSearchParams();
    params.append("username", AT_USERNAME);
    params.append("to", recipients);
    params.append("message", message);
    if (AT_SENDER_ID) params.append("from", AT_SENDER_ID);

    const atRes = await fetch(AT_HOST, {
      method: "POST",
      headers: {
        apiKey: AT_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    const data = await atRes.json().catch(() => ({}));
    if (!atRes.ok) {
      return res.status(502).json({ ok: false, error: "Africa's Talking error", detail: data });
    }

    const recs = data?.SMSMessageData?.Recipients || [];
    const allSent = recs.length > 0 && recs.every((r) => /success|sent/i.test(r.status || ""));
    return res.json({ ok: allSent, recipients: recs, summary: data?.SMSMessageData?.Message });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

/* ---------------------------------------------------------------------------
 * Serve the built front-end (single-service deploy).
 * `dist/` is produced by `npm run build` at the repo root during the build step.
 * API routes above take precedence; everything else falls back to index.html
 * so the single-page app can handle its own view state.
 * ------------------------------------------------------------------------- */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(Number(PORT), () => {
  console.log(`Dalili running on port ${PORT} (env: ${AT_ENV})`);
  if (!AT_API_KEY) console.warn("⚠  AT_API_KEY is not set — /api/sms will return 503 until configured.");
});
