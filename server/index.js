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
  // Africa's Talking
  AT_USERNAME = "sandbox",
  AT_API_KEY = "",              // SECRET
  AT_SENDER_ID = "",            // optional short code / alphanumeric sender id
  AT_ENV = "sandbox",           // "sandbox" | "live"
  // Twilio (easiest path to a real phone via the free trial)
  TWILIO_ACCOUNT_SID = "",      // starts AC...
  TWILIO_AUTH_TOKEN = "",       // SECRET
  TWILIO_FROM_NUMBER = "",      // your Twilio number, e.g. +1XXXXXXXXXX
} = process.env;

// Render (and most PaaS) inject PORT and expect the app to bind to it.
const PORT = process.env.PORT || process.env.SMS_PORT || "8787";

// Choose a provider based on which credentials are present. Twilio wins if set
// (it can reach a real phone on the free trial); otherwise Africa's Talking.
const twilioReady = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);
const atReady = Boolean(AT_API_KEY);
const provider = twilioReady ? "twilio" : atReady ? "africastalking" : "none";

const AT_HOST =
  AT_ENV === "live"
    ? "https://api.africastalking.com/version1/messaging"
    : "https://api.sandbox.africastalking.com/version1/messaging";

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "dalili-sms",
    provider,
    env: provider === "twilio" ? "live" : AT_ENV,
    configured: provider !== "none",
    username: AT_USERNAME,
  });
});

async function sendViaTwilio(to, message) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const body = new URLSearchParams({ To: String(to), From: TWILIO_FROM_NUMBER, Body: message });
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: data.message || `Twilio error ${r.status}`, detail: data };
  return { ok: true, provider: "twilio", sid: data.sid, status: data.status };
}

async function sendViaAfricasTalking(to, message) {
  const params = new URLSearchParams();
  params.append("username", AT_USERNAME);
  params.append("to", Array.isArray(to) ? to.join(",") : String(to));
  params.append("message", message);
  if (AT_SENDER_ID) params.append("from", AT_SENDER_ID);
  const r = await fetch(AT_HOST, {
    method: "POST",
    headers: { apiKey: AT_API_KEY, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: params.toString(),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: "Africa's Talking error", detail: data };
  const recs = data?.SMSMessageData?.Recipients || [];
  const ok = recs.length > 0 && recs.every((x) => /success|sent/i.test(x.status || ""));
  return { ok, provider: "africastalking", recipients: recs, summary: data?.SMSMessageData?.Message };
}

app.post("/api/sms", async (req, res) => {
  try {
    const { to, message } = req.body || {};
    if (!to || !message) {
      return res.status(400).json({ ok: false, error: "Both 'to' and 'message' are required." });
    }
    if (provider === "none") {
      return res.status(503).json({
        ok: false,
        error: "SMS backend not configured. Set Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER) or Africa's Talking (AT_API_KEY) env vars on the server.",
      });
    }
    const result = provider === "twilio"
      ? await sendViaTwilio(to, message)
      : await sendViaAfricasTalking(to, message);
    return res.status(result.ok ? 200 : 502).json(result);
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
  console.log(`Dalili running on port ${PORT} (SMS provider: ${provider})`);
  if (provider === "none") console.warn("⚠  No SMS provider configured — /api/sms returns 503 until Twilio or Africa's Talking env vars are set.");
});
