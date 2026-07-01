import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  MapPin, Navigation, Search, BellRing, AlertTriangle, Wind, Droplets,
  Thermometer, Eye, Gauge, Sunrise, Sunset, TrendingUp, Settings as SettingsIcon,
  Sprout, Truck, Plane, Mountain, CalendarDays, Building2, User, Globe,
  ChevronRight, X, Plus, RefreshCw, Languages, Compass, Check, Info, Clock,
  LayoutDashboard, Map as MapIcon, Lightbulb, Loader2, Sun, Moon, Cloud, CloudSun,
  CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Menu,
  Umbrella, Waves, Zap, Phone, LogOut, LogIn, UserPlus, Trash2, ShieldCheck,
  Send, Star, Mail, Lock, KeyRound, Smartphone, Inbox, Crosshair,
} from "lucide-react";

/* ============================================================================
   DALILI — Hyperlocal Weather Alerts for Kenya  ·  BAC-2202
   "Soma anga, panga vyema" — read the sky, plan well.
   Live data: Open-Meteo (keyless, CORS-enabled).
   Sky-coded UI · fully responsive · accounts + saved data · SMS number service
   · Google Maps (with SVG fallback). All nine SRS modules present.
   ========================================================================== */

/* ----------------------------- Reference data ----------------------------- */

const LOCATIONS = [
  { id: "nairobi",  name: "Nairobi",   region: "Nairobi County",  lat: -1.2864, lon: 36.8172, note: "Capital · highland" },
  { id: "mombasa",  name: "Mombasa",   region: "Mombasa County",  lat: -4.0435, lon: 39.6682, note: "Coast · humid" },
  { id: "kisumu",   name: "Kisumu",    region: "Kisumu County",   lat: -0.0917, lon: 34.7680, note: "Lake basin" },
  { id: "nakuru",   name: "Nakuru",    region: "Nakuru County",   lat: -0.3031, lon: 36.0800, note: "Rift Valley" },
  { id: "eldoret",  name: "Eldoret",   region: "Uasin Gishu",     lat:  0.5143, lon: 35.2698, note: "Grain belt" },
  { id: "thika",    name: "Thika",     region: "Kiambu County",   lat: -1.0333, lon: 37.0693, note: "Peri-urban" },
  { id: "nyeri",    name: "Nyeri",     region: "Nyeri County",    lat: -0.4167, lon: 36.9500, note: "Central highlands" },
  { id: "kericho",  name: "Kericho",   region: "Kericho County",  lat: -0.3677, lon: 35.2831, note: "Tea country" },
  { id: "machakos", name: "Machakos",  region: "Machakos County", lat: -1.5177, lon: 37.2634, note: "Semi-arid" },
  { id: "garissa",  name: "Garissa",   region: "Garissa County",  lat: -0.4536, lon: 39.6461, note: "Arid · hot" },
  { id: "kitale",   name: "Kitale",    region: "Trans-Nzoia",     lat:  1.0157, lon: 35.0062, note: "Maize belt" },
  { id: "malindi",  name: "Malindi",   region: "Kilifi County",   lat: -3.2175, lon: 40.1191, note: "Coast" },
  { id: "naivasha", name: "Naivasha",  region: "Nakuru County",   lat: -0.7167, lon: 36.4333, note: "Horticulture" },
  { id: "meru",     name: "Meru",      region: "Meru County",     lat:  0.0500, lon: 37.6500, note: "Mt. Kenya slopes" },
  { id: "lodwar",   name: "Lodwar",    region: "Turkana County",  lat:  3.1191, lon: 35.5973, note: "Hot arid north" },
  { id: "lamu",     name: "Lamu",      region: "Lamu County",     lat: -2.2717, lon: 40.9020, note: "Archipelago" },
];

const ROLES = [
  { id: "mkulima",  en: "Farmer",          sw: "Mkulima",   Icon: Sprout },
  { id: "usafiri",  en: "Transporter",     sw: "Usafiri",   Icon: Truck },
  { id: "rubani",   en: "Pilot",           sw: "Rubani",    Icon: Plane },
  { id: "mpanda",   en: "Hiker",           sw: "Mpanda",    Icon: Mountain },
  { id: "matukio",  en: "Event organizer", sw: "Matukio",   Icon: CalendarDays },
  { id: "biashara", en: "Business owner",  sw: "Biashara",  Icon: Building2 },
  { id: "mtumiaji", en: "General",         sw: "Mtumiaji",  Icon: User },
];

const NAV = [
  { id: "dashboard", en: "Dashboard",  sw: "Anga",       Icon: LayoutDashboard },
  { id: "alerts",    en: "Alerts",     sw: "Tahadhari",  Icon: BellRing },
  { id: "history",   en: "History",    sw: "Historia",   Icon: Clock },
  { id: "trends",    en: "Trends",     sw: "Mwenendo",   Icon: TrendingUp },
  { id: "map",       en: "Map",        sw: "Maeneo",     Icon: MapIcon },
  { id: "advice",    en: "Advisories", sw: "Ushauri",    Icon: Lightbulb },
  { id: "notify",    en: "Notifications", sw: "Arifa",   Icon: Smartphone },
  { id: "settings",  en: "Settings",   sw: "Mipangilio", Icon: SettingsIcon },
];

const DEFAULT_THRESHOLDS = { rain: 7.6, flood6h: 30, wind: 40, heat: 32, uv: 8 };
const DEFAULT_NOTIFY = { push: true, smsNotice: false, smsWatch: true, smsWarning: true };

const STR = {
  en: {
    tagline: "Read the sky, plan well", brand_sub: "Hyperlocal weather alerts · Kenya",
    detect: "Use my location", choose: "Or choose a place", continue: "Continue",
    pick_role: "Who are you planning for?", pick_role_sub: "We tailor alerts and advice to your work.",
    welcome: "Welcome to Dalili", feels: "Feels like", updated: "Updated", now: "Now",
    today: "Today", hourly: "Next 24 hours", daily: "7-day outlook", active_alerts: "Active alerts",
    no_alerts: "No active alerts", no_alerts_sub: "Conditions are within your thresholds.",
    your_advice: "For you", wind: "Wind", humidity: "Humidity", uv: "UV index", rain: "Rain",
    pressure: "Pressure", visibility: "Visibility", sunrise: "Sunrise", sunset: "Sunset",
    gust: "gusts", search_place: "Search Kenyan towns", search_loc: "Search location", add: "Add", saved: "Saved locations",
    thresholds: "Alert thresholds", role: "Profile", language: "Language", units: "Units",
    notifs: "Notifications", about: "About Dalili", history: "Alert history", trends_t: "Weather trends",
    history_sub: "Alerts raised for your locations over the last 30 days",
    no_history: "No alerts recorded yet", no_history_sub: "Alerts will be logged here as conditions cross your thresholds.",
    clear_history: "Clear history",
    trends_sub: "Last 7 days and the week ahead", temp_trend: "Temperature", precip_trend: "Daily rainfall",
    season: "Season", map_t: "Your places across Kenya", retry: "Retry", loading: "Reading the sky…",
    err: "Couldn't reach the weather service", advice_for: "Advisories for", preview_role: "Preview as",
    high: "H", low: "L", chance: "chance", departure: "Best windows", refresh: "Refresh",
    push: "Browser push notifications", sms: "SMS alerts (Africa's Talking)", email: "Email summaries",
    rain_th: "Heavy rain (mm/hr)", wind_th: "High wind (km/h)", heat_th: "Extreme heat (°C)", uv_th: "High UV index",
    appearance: "Appearance", theme_light: "Light", theme_dark: "Dark", theme_auto: "Auto",
    save: "Save", saved_ok: "Saved", sign: "Dalili sign", impact: "What it means", action: "What to do",
    open_advice: "See advisories", reading: "Reading", current_loc: "Current",
  },
  sw: {
    tagline: "Soma anga, panga vyema", brand_sub: "Tahadhari za hali ya hewa · Kenya",
    detect: "Tumia eneo langu", choose: "Au chagua eneo", continue: "Endelea",
    pick_role: "Unapanga kwa ajili ya nani?", pick_role_sub: "Tunaboresha tahadhari na ushauri kwa kazi yako.",
    welcome: "Karibu Dalili", feels: "Inahisi kama", updated: "Imesasishwa", now: "Sasa",
    today: "Leo", hourly: "Saa 24 zijazo", daily: "Mtazamo wa siku 7", active_alerts: "Tahadhari hai",
    no_alerts: "Hakuna tahadhari", no_alerts_sub: "Hali iko ndani ya viwango vyako.",
    your_advice: "Kwa ajili yako", wind: "Upepo", humidity: "Unyevu", uv: "Kiwango cha UV", rain: "Mvua",
    pressure: "Mgandamizo", visibility: "Mwonekano", sunrise: "Mawio", sunset: "Machweo",
    gust: "vimbunga", search_place: "Tafuta miji ya Kenya", search_loc: "Tafuta eneo", add: "Ongeza", saved: "Maeneo yaliyohifadhiwa",
    thresholds: "Viwango vya tahadhari", role: "Wasifu", language: "Lugha", units: "Vipimo",
    notifs: "Arifa", about: "Kuhusu Dalili", history: "Historia ya tahadhari", trends_t: "Mwenendo wa hali ya hewa",
    history_sub: "Tahadhari za maeneo yako katika siku 30 zilizopita",
    no_history: "Hakuna tahadhari iliyorekodiwa bado", no_history_sub: "Tahadhari zitarekodiwa hapa hali zinapovuka viwango vyako.",
    clear_history: "Futa historia",
    trends_sub: "Siku 7 zilizopita na wiki ijayo", temp_trend: "Joto", precip_trend: "Mvua ya kila siku",
    season: "Msimu", map_t: "Maeneo yako nchini Kenya", retry: "Jaribu tena", loading: "Inasoma anga…",
    err: "Imeshindwa kufikia huduma ya hali ya hewa", advice_for: "Ushauri kwa", preview_role: "Tazama kama",
    high: "Juu", low: "Chini", chance: "uwezekano", departure: "Nyakati nzuri", refresh: "Onyesha upya",
    push: "Arifa za kivinjari", sms: "Tahadhari za SMS (Africa's Talking)", email: "Muhtasari wa barua pepe",
    rain_th: "Mvua kubwa (mm/saa)", wind_th: "Upepo mkali (km/saa)", heat_th: "Joto kali (°C)", uv_th: "UV ya juu",
    appearance: "Muonekano", theme_light: "Mwangaza", theme_dark: "Giza", theme_auto: "Otomatiki",
    save: "Hifadhi", saved_ok: "Imehifadhiwa", sign: "Dalili", impact: "Maana yake", action: "Fanya hivi",
    open_advice: "Ona ushauri", reading: "Soma", current_loc: "Sasa",
  },
};

/* --------------------------- Weather code mapping -------------------------- */

function weatherInfo(code, isDay = true) {
  const C = (en, sw, scene, Icon) => ({ en, sw, scene, Icon });
  switch (true) {
    case code === 0:                 return C("Clear sky", "Anga safi", isDay ? "clear-day" : "clear-night", isDay ? Sun : Moon);
    case code === 1:                 return C("Mainly clear", "Karibu safi", isDay ? "clear-day" : "clear-night", isDay ? Sun : Moon);
    case code === 2:                 return C("Partly cloudy", "Mawingu kiasi", isDay ? "partly-day" : "partly-night", isDay ? CloudSun : Cloud);
    case code === 3:                 return C("Overcast", "Mawingu mengi", "cloudy", Cloud);
    case code === 45 || code === 48: return C("Fog", "Ukungu", "fog", CloudFog);
    case code >= 51 && code <= 57:   return C("Drizzle", "Manyunyu", "drizzle", CloudDrizzle);
    case code >= 61 && code <= 65:   return C("Rain", "Mvua", code >= 65 ? "heavy-rain" : "rain", CloudRain);
    case code === 66 || code === 67: return C("Freezing rain", "Mvua ya barafu", "rain", CloudRain);
    case code >= 71 && code <= 77:   return C("Snow", "Theluji", "snow", CloudSnow);
    case code >= 80 && code <= 82:   return C("Rain showers", "Manyunyu ya mvua", code === 82 ? "heavy-rain" : "rain", CloudRain);
    case code === 85 || code === 86: return C("Snow showers", "Theluji", "snow", CloudSnow);
    case code >= 95:                 return C("Thunderstorm", "Dhoruba ya radi", "thunder", CloudLightning);
    default:                         return C("Unknown", "Haijulikani", "cloudy", Cloud);
  }
}

/* Sky-coded scene gradients — bright by day, deep by night. */
const SCENES = {
  "clear-day":   { grad: "linear-gradient(165deg,#0EA5E9 0%,#38BDF8 38%,#7DD3FC 70%,#E0F2FE 100%)", text: "#06283d", soft: false },
  "clear-night": { grad: "linear-gradient(170deg,#0B2540 0%,#103a63 55%,#1f5183 100%)", text: "#eef6ff", soft: true },
  "partly-day":  { grad: "linear-gradient(165deg,#2E9FD8 0%,#54B6E8 42%,#A9D9F4 100%)", text: "#06283d", soft: false },
  "partly-night":{ grad: "linear-gradient(170deg,#0d2a47 0%,#16406a 60%,#27568a 100%)", text: "#eef6ff", soft: true },
  "cloudy":      { grad: "linear-gradient(165deg,#5C7896 0%,#7E96AE 55%,#AFC2D4 100%)", text: "#0b2540", soft: true },
  "fog":         { grad: "linear-gradient(165deg,#7787968a 0%,#9AAAB8 55%,#C8D3DD 100%)", text: "#0b2540", soft: true },
  "drizzle":     { grad: "linear-gradient(165deg,#3E6285 0%,#577CA0 58%,#8AA6C0 100%)", text: "#eef6ff", soft: true },
  "rain":        { grad: "linear-gradient(165deg,#33567A 0%,#496c8f 58%,#6e8aa8 100%)", text: "#eef6ff", soft: true },
  "heavy-rain":  { grad: "linear-gradient(165deg,#243f5c 0%,#36527040 58%,#4a6685 100%)", text: "#eef6ff", soft: true },
  "snow":        { grad: "linear-gradient(165deg,#6E8398 0%,#93A6B8 58%,#D2DCE6 100%)", text: "#0b2540", soft: true },
  "thunder":     { grad: "linear-gradient(165deg,#1d2c47 0%,#2c3f60 58%,#3e5374 100%)", text: "#eef6ff", soft: true },
};

/* -------------------------------- Helpers --------------------------------- */

const round = (n) => Math.round(n);
const clampN = (n, a, b) => Math.min(b, Math.max(a, n));
const cToF = (c) => (c * 9) / 5 + 32;
const kmhToMph = (k) => k * 0.621371;

function fTemp(c, units) {
  if (c == null || Number.isNaN(c)) return "—";
  return units === "imperial" ? `${round(cToF(c))}°` : `${round(c)}°`;
}
function fWind(k, units) {
  if (k == null) return "—";
  return units === "imperial" ? `${round(kmhToMph(k))} mph` : `${round(k)} km/h`;
}
function compass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}
function hourLabel(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}
function dayLabel(iso) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
}
function timeOnly(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function nowHourIndex(times) {
  if (!times) return 0;
  const now = Date.now();
  const idx = times.findIndex((t) => new Date(t).getTime() >= now - 30 * 60 * 1000);
  return idx === -1 ? Math.max(0, times.length - 24) : idx;
}
function nowDayIndex(times) {
  if (!times) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const i = times.findIndex((t) => t.slice(0, 10) === today);
  return i === -1 ? 0 : i;
}
function kenyaSeason(date = new Date()) {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return { en: "Long rains", sw: "Masika", tone: "wet" };
  if (m >= 9 && m <= 11) return { en: "Short rains", sw: "Vuli", tone: "wet" };
  if (m >= 5 && m <= 8) return { en: "Cool dry season", sw: "Kipupwe", tone: "dry" };
  return { en: "Hot dry season", sw: "Kiangazi", tone: "dry" };
}
const uvBand = (uv) => {
  const map = [[3, "Low"], [6, "Moderate"], [8, "High"], [11, "Very high"], [99, "Extreme"]];
  return (map.find(([n]) => uv < n) || map[map.length - 1])[1];
};

/* Kenyan phone normalisation → +2547######## / +2541######## */
function normalizePhone(raw) {
  if (!raw) return { ok: false, value: "", reason: "empty" };
  let s = raw.replace(/[\s\-()]/g, "");
  if (s.startsWith("+254")) s = s.slice(4);
  else if (s.startsWith("254")) s = s.slice(3);
  else if (s.startsWith("0")) s = s.slice(1);
  if (!/^\d+$/.test(s)) return { ok: false, value: raw, reason: "invalid characters" };
  if (s.length !== 9 || !/^[17]/.test(s)) return { ok: false, value: raw, reason: "not a valid Kenyan number" };
  return { ok: true, value: `+254${s}`, reason: "" };
}
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || "").trim());

/* ----------------------------- Alert engine ------------------------------- */

function buildAlerts(data, th, lang) {
  if (!data) return [];
  const L = STR[lang];
  const out = [];
  const h = data.hourly, d = data.daily, cur = data.current;
  const i0 = nowHourIndex(h.time);
  const win = (arr) => arr.slice(i0, i0 + 6);
  const next6Rain = win(h.precipitation).reduce((a, b) => a + (b || 0), 0);
  const maxRainRate = Math.max(cur.precipitation || 0, ...win(h.precipitation));
  const codes6 = win(h.weather_code);
  const storm = codes6.some((c) => c >= 95);
  const maxGust = Math.max(cur.wind_gusts_10m || cur.wind_speed_10m || 0, ...win(h.wind_speed_10m));
  const apparent = cur.apparent_temperature ?? cur.temperature_2m;
  const uvMax = d.uv_index_max?.[nowDayIndex(d.time)] ?? 0;
  const lowVis = (win(h.visibility).some((v) => v != null && v < 1000)) || [45, 48].includes(cur.weather_code);

  const sev = (lvl) => ({
    notice:  { key: "notice",  en: "Notice",  sw: "Taarifa",  color: "var(--sky)" },
    watch:   { key: "watch",   en: "Watch",   sw: "Tahadhari", color: "var(--amber)" },
    warning: { key: "warning", en: "Warning", sw: "Onyo",     color: "var(--ember)" },
  }[lvl]);

  const A = (id, Icon, en, sw, level, w, impactEn, impactSw, actionEn, actionSw) =>
    out.push({ id, Icon, title: lang === "sw" ? sw : en, sub: lang === "sw" ? en : sw,
      sev: sev(level), window: w, impact: lang === "sw" ? impactSw : impactEn,
      action: lang === "sw" ? actionSw : actionEn });

  if (storm)
    A("storm", CloudLightning, "Thunderstorm", "Dhoruba ya radi", "warning", "Next 6 hours",
      "Lightning, gusty winds and heavy downpours likely.", "Radi, upepo na mvua kubwa zinatarajiwa.",
      "Stay indoors, avoid open ground and tall trees.", "Baki ndani, epuka maeneo wazi na miti mirefu.");

  if (next6Rain >= th.flood6h)
    A("flood", Waves, "Flash flood risk", "Hatari ya mafuriko", "warning", "Next 6 hours",
      `About ${round(next6Rain)} mm of rain expected — drainage and low areas may flood.`,
      `Takriban mm ${round(next6Rain)} za mvua — mitaro na maeneo ya chini yanaweza kufurika.`,
      "Avoid flooded crossings and low-lying roads.", "Epuka mito iliyojaa na barabara za mabondeni.");
  else if (maxRainRate >= th.rain)
    A("rain", CloudRain, "Heavy rain", "Mvua kubwa", maxRainRate >= th.rain * 2 ? "warning" : "watch",
      "Within 6 hours", `Rain up to ${maxRainRate.toFixed(1)} mm/hr expected.`,
      `Mvua hadi mm ${maxRainRate.toFixed(1)}/saa inatarajiwa.`,
      "Carry rain protection; expect slower travel.", "Beba kinga ya mvua; safari itakuwa polepole.");

  if (maxGust >= th.wind)
    A("wind", Wind, "High wind", "Upepo mkali", maxGust >= th.wind * 1.5 ? "warning" : "watch",
      "Within 6 hours", `Gusts up to ${round(maxGust)} km/h.`, `Vimbunga hadi km ${round(maxGust)}/saa.`,
      "Secure loose items and light structures.", "Imarisha vitu na miundo myepesi.");

  if (apparent >= th.heat)
    A("heat", Thermometer, "Extreme heat", "Joto kali", apparent >= th.heat + 5 ? "warning" : "watch",
      L.today, `Feels like ${round(apparent)}°C — heat stress possible.`,
      `Inahisi ${round(apparent)}°C — uwezekano wa joto kupita kiasi.`,
      "Hydrate, rest in shade during midday.", "Kunywa maji, pumzika kivulini mchana.");

  if (uvMax >= th.uv)
    A("uv", Sun, "High UV", "UV ya juu", uvMax >= 11 ? "warning" : "notice", L.today,
      `UV index peaks near ${round(uvMax)}.`, `Kiwango cha UV kinafikia ${round(uvMax)}.`,
      "Use sunscreen and cover up outdoors.", "Tumia kinga ya jua na funika ngozi nje.");

  if (lowVis)
    A("fog", CloudFog, "Low visibility", "Mwonekano hafifu", "notice", "Now",
      "Fog or mist reducing visibility.", "Ukungu unapunguza mwonekano.",
      "Drive with lights on; allow extra distance.", "Endesha na taa; acha nafasi zaidi.");

  return out;
}

/* ----------------------------- Dalili "sign" ------------------------------ */

function daliliSign(data, lang) {
  if (!data) return null;
  const h = data.hourly, cur = data.current;
  const i0 = nowHourIndex(h.time);
  const next = h.precipitation_probability.slice(i0, i0 + 12);
  const codes = h.weather_code.slice(i0, i0 + 12);
  const rainingNow = (cur.precipitation || 0) > 0.05;

  const stormIdx = codes.findIndex((c) => c >= 95);
  if (stormIdx >= 0 && stormIdx <= 6)
    return { Icon: Zap, en: `Storm building in ~${stormIdx + 1} hr`,
      sw: `Dhoruba inajengeka — saa ~${stormIdx + 1} zijazo`, tone: "alert" };

  if (rainingNow) {
    const clearIdx = next.findIndex((p, k) => k > 0 && p < 30);
    if (clearIdx > 0)
      return { Icon: Sun, en: `Skies clearing in ~${clearIdx} hr`, sw: `Anga linafunguka saa ~${clearIdx} zijazo`, tone: "good" };
    return { Icon: CloudRain, en: "Rain set in — staying wet a while", sw: "Mvua imeshika — itaendelea kwa muda", tone: "caution" };
  }

  const rainIdx = next.findIndex((p) => p >= 55);
  if (rainIdx >= 0)
    return { Icon: Umbrella, en: `Rain likely in ~${rainIdx + 1} hr`, sw: `Mvua yawezekana saa ~${rainIdx + 1} zijazo`, tone: "caution" };

  return { Icon: Check, en: "Settled conditions ahead", sw: "Hali shwari mbele", tone: "good" };
}

/* --------------------------- Advisory generator --------------------------- */

function advisoriesFor(role, data, lang) {
  if (!data) return [];
  const cur = data.current, d = data.daily, h = data.hourly;
  const di = nowDayIndex(d.time);
  const i0 = nowHourIndex(h.time);
  const rainToday = d.precipitation_sum?.[di] ?? 0;
  const rainProb = d.precipitation_probability_max?.[di] ?? 0;
  const windNow = cur.wind_speed_10m ?? 0;
  const gust = cur.wind_gusts_10m ?? windNow;
  const uv = d.uv_index_max?.[di] ?? 0;
  const tMax = d.temperature_2m_max?.[di] ?? cur.temperature_2m;
  const tMin = d.temperature_2m_min?.[di] ?? cur.temperature_2m;
  const next12 = h.precipitation_probability.slice(i0, i0 + 12);
  const dryHours = next12.reduce((a, p, idx) => (p < 30 ? a.concat(idx) : a), []);
  const season = kenyaSeason();
  const pick = (en, sw) => (lang === "sw" ? sw : en);
  const card = (Icon, te, ts, be, bs, tone) =>
    ({ Icon, title: pick(te, ts), body: pick(be, bs), tone });
  const cards = [];

  if (role === "mkulima") {
    if (gust > 20 || rainProb > 50)
      cards.push(card(Wind, "Hold off spraying", "Subiri kunyunyizia",
        `Wind ${round(gust)} km/h or rain (${rainProb}% today) will cause drift and wash-off. Wait for a calm, dry window.`,
        `Upepo km ${round(gust)}/saa au mvua (${rainProb}% leo) itasambaza dawa. Subiri muda tulivu, kavu.`, "caution"));
    else
      cards.push(card(Sprout, "Good spraying window", "Muda mzuri wa kunyunyizia",
        `Calm and dry now — suitable for foliar sprays. Aim for early morning before winds pick up.`,
        `Tulivu na kavu sasa — yafaa kwa dawa za majani. Lenga asubuhi kabla upepo haujaongezeka.`, "good"));
    if (rainToday >= 5)
      cards.push(card(CloudRain, "Skip irrigation today", "Ruka umwagiliaji leo",
        `~${round(rainToday)} mm of rain expected — soil moisture should be replenished naturally.`,
        `~mm ${round(rainToday)} za mvua zinatarajiwa — unyevu wa udongo utajaa wenyewe.`, "good"));
    else
      cards.push(card(Droplets, "Irrigation may be needed", "Umwagiliaji waweza kuhitajika",
        `Little rain today (${round(rainToday)} mm). Check topsoil and irrigate young crops in the cool hours.`,
        `Mvua kidogo leo (mm ${round(rainToday)}). Kagua udongo na umwagilie mimea michanga nyakati za baridi.`, "caution"));
    cards.push(card(CalendarDays, `${season.en} planning`, `Mpango wa ${season.sw}`,
      season.tone === "wet"
        ? "We are in a rainy season — favour planting, top-dressing and weeding around reliable rains."
        : "Drier season — prioritise water-conserving practices, mulching and drought-tolerant varieties.",
      season.tone === "wet"
        ? "Tuko msimu wa mvua — pendelea kupanda, kuongeza mbolea na kupalilia karibu na mvua za uhakika."
        : "Msimu wa ukame — tanguliza kuhifadhi maji, matandazo na mbegu zinazostahimili ukame.", "neutral"));
  }

  if (role === "usafiri") {
    if (rainToday >= 15 || rainProb > 60)
      cards.push(card(Waves, "Flood-prone routes at risk", "Njia za mafuriko hatarini",
        `Heavy rain (${round(rainToday)} mm, ${rainProb}% chance) — expect ponding on low roads and longer journey times.`,
        `Mvua kubwa (mm ${round(rainToday)}, ${rainProb}%) — tarajia maji barabarani na safari ndefu.`, "alert"));
    cards.push(card(Clock, "Best departure windows", "Nyakati nzuri za kuondoka",
      dryHours.length
        ? `Driest hours ahead: ${dryHours.slice(0, 3).map((k) => hourLabel(h.time[i0 + k])).join(", ")}.`
        : `Wet for the next several hours — build in buffer time and drive with lights on.`,
      dryHours.length
        ? `Saa kavu zaidi: ${dryHours.slice(0, 3).map((k) => hourLabel(h.time[i0 + k])).join(", ")}.`
        : `Mvua kwa saa kadhaa — ongeza muda na endesha na taa.`, dryHours.length ? "good" : "caution"));
  }

  if (role === "rubani") {
    const vis = cur.visibility != null ? round(cur.visibility / 1000) : null;
    cards.push(card(Eye, "Visibility & ceiling", "Mwonekano",
      `${vis != null ? `Surface visibility ~${vis} km. ` : ""}Cloud cover ${round(cur.cloud_cover ?? 0)}%. Advisory only — file with official aviation briefings.`,
      `${vis != null ? `Mwonekano ~km ${vis}. ` : ""}Mawingu ${round(cur.cloud_cover ?? 0)}%. Ni mwongozo tu — tegemea taarifa rasmi za anga.`, vis != null && vis < 5 ? "alert" : "neutral"));
    cards.push(card(Compass, "Wind & gusts", "Upepo na vimbunga",
      `Surface wind ${round(windNow)} km/h from ${compass(cur.wind_direction_10m ?? 0)}, gusts ${round(gust)} km/h. Watch crosswind on approach.`,
      `Upepo km ${round(windNow)}/saa kutoka ${compass(cur.wind_direction_10m ?? 0)}, vimbunga km ${round(gust)}/saa. Angalia upepo wa kando wakati wa kutua.`, gust > 35 ? "caution" : "good"));
  }

  if (role === "mpanda") {
    cards.push(card(Umbrella, "Rain timing on the trail", "Mvua njiani",
      rainProb > 40
        ? `${rainProb}% chance today. Start early and plan to be off exposed ridges before afternoon build-up.`
        : `Low rain chance (${rainProb}%). Conditions look favourable for the trail.`,
      rainProb > 40
        ? `${rainProb}% leo. Anza mapema, shuka kutoka vilele kabla ya mvua za mchana.`
        : `Uwezekano mdogo wa mvua (${rainProb}%). Hali nzuri kwa safari.`, rainProb > 40 ? "caution" : "good"));
    cards.push(card(Sun, "Sun & temperature", "Jua na joto",
      `High ${round(tMax)}°C, low ${round(tMin)}°C, UV up to ${round(uv)}. Carry layers and sun protection.`,
      `Juu ${round(tMax)}°C, chini ${round(tMin)}°C, UV hadi ${round(uv)}. Beba nguo za tabaka na kinga ya jua.`, uv >= 8 ? "caution" : "neutral"));
  }

  if (role === "matukio") {
    cards.push(card(CalendarDays, "Outdoor event comfort", "Hali ya tukio la nje",
      `Today: ${round(tMax)}°C high, ${rainProb}% rain chance, wind ${round(windNow)} km/h. ${rainProb > 50 ? "Have a wet-weather contingency ready." : "Conditions look manageable for outdoor gatherings."}`,
      `Leo: ${round(tMax)}°C, ${rainProb}% mvua, upepo km ${round(windNow)}/saa. ${rainProb > 50 ? "Andaa mpango wa mvua." : "Hali yafaa kwa matukio ya nje."}`, rainProb > 50 ? "caution" : "good"));
    if (gust > 30)
      cards.push(card(Wind, "Secure tents and staging", "Imarisha mahema",
        `Gusts up to ${round(gust)} km/h — anchor marquees, banners and lighting rigs.`,
        `Vimbunga hadi km ${round(gust)}/saa — funga mahema, mabango na taa.`, "alert"));
  }

  if (role === "biashara") {
    cards.push(card(Building2, "Operations outlook", "Mtazamo wa biashara",
      `${rainProb > 50 ? "Wet day likely — footfall may dip and deliveries could slow." : "Stable day — minimal weather disruption expected."} High ${round(tMax)}°C.`,
      `${rainProb > 50 ? "Siku ya mvua — wateja na usafirishaji vyaweza kupungua." : "Siku tulivu — usumbufu mdogo."} Juu ${round(tMax)}°C.`, rainProb > 50 ? "caution" : "good"));
  }

  if (role === "mtumiaji" || cards.length === 0) {
    cards.push(card(Info, "Plan your day", "Panga siku yako",
      `${rainProb}% chance of rain, high ${round(tMax)}°C, UV up to ${round(uv)}. ${rainProb > 40 ? "Keep an umbrella handy." : "A good day to be outdoors."}`,
      `${rainProb}% mvua, juu ${round(tMax)}°C, UV hadi ${round(uv)}. ${rainProb > 40 ? "Beba mwavuli." : "Siku nzuri ya kuwa nje."}`, "neutral"));
  }

  return cards;
}

/* ============================ Google Maps loader =========================== */

let gmapsPromise = null;
function loadGoogleMaps(key) {
  if (window.google && window.google.maps) return Promise.resolve(window.google);
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    s.async = true; s.defer = true;
    s.onload = () => (window.google && window.google.maps) ? resolve(window.google) : reject(new Error("maps-unavailable"));
    s.onerror = () => { gmapsPromise = null; reject(new Error("maps-failed")); };
    document.head.appendChild(s);
  });
  return gmapsPromise;
}
function useGoogleMaps(key) {
  const [state, setState] = useState({ loaded: false, error: null });
  useEffect(() => {
    if (!key) { setState({ loaded: false, error: "no-key" }); return; }
    let alive = true;
    setState({ loaded: false, error: null });
    loadGoogleMaps(key)
      .then(() => alive && setState({ loaded: true, error: null }))
      .catch(() => alive && setState({ loaded: false, error: "failed" }));
    return () => { alive = false; };
  }, [key]);
  return state;
}

/* ============================== Subcomponents ============================== */

/* Random helper for procedurally-placed sky effects. */
const rnd = (a, b) => a + Math.random() * (b - a);

/* Real constellations (approximate star patterns, normalised 0–100). */
const CONSTELLATIONS = {
  orion: {
    stars: [
      { x: 70, y: 18, r: 1.8 }, { x: 38, y: 22, r: 1.6 }, // Betelgeuse, Bellatrix
      { x: 58, y: 50, r: 1.5 }, { x: 50, y: 52, r: 1.6 }, { x: 42, y: 54, r: 1.5 }, // belt
      { x: 64, y: 82, r: 1.6 }, { x: 36, y: 84, r: 1.9 }, // Saiph, Rigel
    ],
    edges: [[0, 1], [1, 4], [0, 2], [2, 3], [3, 4], [2, 5], [4, 6], [1, 6], [0, 5]],
  },
  crux: { // Southern Cross — visible from Kenya
    stars: [{ x: 50, y: 6, r: 1.7 }, { x: 50, y: 94, r: 1.9 }, { x: 16, y: 52, r: 1.4 }, { x: 84, y: 44, r: 1.5 }],
    edges: [[0, 1], [2, 3]],
  },
  dipper: { // Big Dipper (Ursa Major)
    stars: [
      { x: 8, y: 62 }, { x: 26, y: 56 }, { x: 44, y: 60 }, { x: 60, y: 52 },
      { x: 62, y: 30 }, { x: 44, y: 26 }, { x: 30, y: 36 },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
  },
};

function Constellation({ data, className, style }) {
  return (
    <svg className={`dl-constel ${className || ""}`} viewBox="0 0 100 100" style={style} aria-hidden="true">
      {data.edges.map(([a, b], i) => (
        <line key={i} x1={data.stars[a].x} y1={data.stars[a].y} x2={data.stars[b].x} y2={data.stars[b].y} />
      ))}
      {data.stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r || 1.3} style={{ animationDelay: `${(i % 5) * 0.6}s` }} />
      ))}
    </svg>
  );
}

/* Reusable location search (worldwide, keyless via Open-Meteo geocoding). */
function LocationSearch({ t, onPick, placeholder }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return undefined; }
    let alive = true;
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
        const j = await r.json();
        const list = (j.results || []).map((x) => ({
          id: `geo-${x.id}`, name: x.name,
          region: [x.admin1, x.country].filter(Boolean).join(", ") || "—",
          lat: x.latitude, lon: x.longitude,
        }));
        if (alive) setResults(list);
      } catch { if (alive) setResults([]); }
      finally { if (alive) setSearching(false); }
    }, 300);
    return () => { alive = false; clearTimeout(id); };
  }, [q]);

  const pick = (loc) => { onPick(loc); setResults([]); setQ(loc.name); };

  return (
    <div className="dl-mapsearch">
      <Field icon={Search} value={q} placeholder={placeholder || t.search_loc}
        onChange={(e) => setQ(e.target.value)} inputMode="search" />
      {searching && <Loader2 size={16} className="dl-spin dl-mapsearch-spin" />}
      {results.length > 0 && (
        <div className="dl-search-res dl-mapsearch-res">
          {results.map((r) => (
            <button key={r.id} className="dl-search-row" onClick={() => pick(r)}>
              <MapPin size={16} /> <span>{r.name}</span><small>{r.region}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LivingSky({ scene, info, cur, units, t, di, data, location }) {
  const isNight = scene.includes("night");
  const isRain = scene === "rain" || scene === "drizzle" || scene === "heavy-rain";
  const heavy = scene === "heavy-rain";
  const isThunder = scene === "thunder";
  const showClouds = scene === "cloudy" || scene === "fog" || scene.includes("partly") || isRain || isThunder;
  const isDayClear = (scene.includes("clear") || scene.includes("partly")) && !isNight;
  const dropCount = heavy ? 110 : scene === "drizzle" ? 46 : 72;
  const Icon = info?.Icon || Cloud;
  const sunrise = data?.daily?.sunrise?.[di];
  const sunset = data?.daily?.sunset?.[di];

  // Randomly generated placements/timing — regenerated whenever the scene changes,
  // so every visit (and every weather change) looks a little different.
  const fx = useMemo(() => ({
    stars: Array.from({ length: 70 }, () => ({ left: rnd(0, 100), top: rnd(0, 94), delay: rnd(0, 5), dur: rnd(2.4, 5.5), size: rnd(1.4, 3) })),
    drops: Array.from({ length: dropCount }, () => ({ left: rnd(-2, 100), delay: rnd(0, 2), dur: rnd(heavy ? 0.45 : 0.6, heavy ? 0.7 : 0.95), len: rnd(12, 22) })),
    birds: Array.from({ length: 6 }, () => ({ top: rnd(6, 40), dur: rnd(24, 46), delay: rnd(0, 30), w: rnd(15, 30), dip: rnd(-34, -8), flap: rnd(0.4, 0.7) })),
    shooters: Array.from({ length: 5 }, () => ({ top: rnd(3, 46), left: rnd(15, 82), ang: rnd(16, 40), dist: rnd(340, 620), dur: rnd(6, 12), delay: rnd(0, 14) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [scene, heavy, dropCount]);

  return (
    <div className="dl-sky" aria-hidden="false">
      <div className="dl-skyfx" aria-hidden="true">
        {isDayClear && (
          <>
            <div className="dl-sun"><span className="dl-sun-glow" /><span className="dl-sun-core" /></div>
            {/* Birds gliding across the day sky */}
            <div className="dl-birds">
              {fx.birds.map((b, i) => (
                <div key={i} className="dl-bird" style={{ top: `${b.top}%`, width: `${b.w}px`, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, "--dip": `${b.dip}px` }}>
                  <svg viewBox="0 0 24 10" style={{ animationDuration: `${b.flap}s` }}><path d="M1 8 Q6 1 12 7 Q18 1 23 8" /></svg>
                </div>
              ))}
            </div>
          </>
        )}
        {isNight && (
          <>
            <div className="dl-moon" />
            <div className="dl-stars">
              {fx.stars.map((s, i) => (
                <span key={i} style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px`, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
              ))}
            </div>
            {/* Real constellations */}
            <div className="dl-constels">
              <Constellation data={CONSTELLATIONS.orion} style={{ top: "12%", right: "9%", width: 132, height: 132 }} />
              <Constellation data={CONSTELLATIONS.crux} style={{ top: "42%", left: "13%", width: 72, height: 96 }} />
              <Constellation data={CONSTELLATIONS.dipper} style={{ top: "16%", left: "34%", width: 156, height: 96 }} />
            </div>
            {/* Shooting stars — random start, streak head leads the motion */}
            <div className="dl-shooters">
              {fx.shooters.map((s, i) => (
                <span key={i} className="dl-sh" style={{ top: `${s.top}%`, left: `${s.left}%`, "--ang": `${s.ang}deg`, "--dist": `${s.dist}px`, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
              ))}
            </div>
          </>
        )}
        {showClouds && (
          <div className="dl-clouds">
            <span className="dl-cloud c1" /><span className="dl-cloud c2" /><span className="dl-cloud c3" />
            <span className="dl-cloud c4" /><span className="dl-cloud c5" />
          </div>
        )}
        {(isRain || isThunder) && (
          <div className="dl-rain">
            {fx.drops.map((d, i) => (
              <span key={i} style={{ left: `${d.left}%`, height: `${d.len}px`, animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }} />
            ))}
          </div>
        )}
        {isThunder && <div className="dl-flash" />}
      </div>

      <div className="dl-sky-inner">
        {/* Location, shown on the card */}
        <div className="dl-sky-loc">
          <MapPin size={18} strokeWidth={2.3} />
          <div className="dl-sky-loc-text">
            <span className="dl-sky-loc-name">{location?.name || t.current_loc}</span>
            {location?.region && <span className="dl-sky-loc-region">{location.region}</span>}
          </div>
        </div>

        <div className="dl-sky-now">
          <div className="dl-sky-temp">{fTemp(cur?.temperature_2m, units)}</div>
          <div className="dl-sky-meta">
            <div className="dl-sky-cond"><Icon size={24} strokeWidth={2.2} /> {info ? (t._lang === "sw" ? info.sw : info.en) : "—"}</div>
            <div className="dl-sky-feels">{t.feels} {fTemp(cur?.apparent_temperature, units)}</div>
          </div>
        </div>

        {/* Sunrise / sunset — labelled and colour-coded */}
        <div className="dl-sky-rise">
          <div className="dl-rise sunrise">
            <Sunrise size={22} strokeWidth={2.2} />
            <div className="dl-rise-text">
              <span className="dl-rise-label">{t.sunrise}</span>
              <b>{sunrise ? timeOnly(sunrise) : "—"}</b>
            </div>
          </div>
          <div className="dl-rise sunset">
            <Sunset size={22} strokeWidth={2.2} />
            <div className="dl-rise-text">
              <span className="dl-rise-label">{t.sunset}</span>
              <b>{sunset ? timeOnly(sunset) : "—"}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ Icon, label, value, sub }) {
  return (
    <div className="dl-metric">
      <div className="dl-metric-ic"><Icon size={22} strokeWidth={2.1} /></div>
      <div className="dl-metric-body">
        <div className="dl-metric-label">{label}</div>
        <div className="dl-metric-val">{value} {sub && <span className="dl-metric-sub">{sub}</span>}</div>
      </div>
    </div>
  );
}

function HourlyStrip({ data, units }) {
  const h = data.hourly;
  const i0 = nowHourIndex(h.time);
  const items = Array.from({ length: 24 }).map((_, k) => i0 + k).filter((i) => i < h.time.length);
  return (
    <div className="dl-hours">
      {items.map((i, k) => {
        const info = weatherInfo(h.weather_code[i], h.is_day ? h.is_day[i] : 1);
        const Ic = info.Icon;
        const p = h.precipitation_probability[i];
        return (
          <div className="dl-hour" key={i}>
            <div className="dl-hour-t">{k === 0 ? "Now" : hourLabel(h.time[i])}</div>
            <Ic size={26} strokeWidth={2} className="dl-hour-ic" />
            <div className="dl-hour-temp">{fTemp(h.temperature_2m[i], units)}</div>
            <div className={`dl-hour-p ${p >= 50 ? "hot" : ""}`}>{p > 5 ? `${p}%` : ""}&nbsp;</div>
          </div>
        );
      })}
    </div>
  );
}

function DailyList({ data, units, t }) {
  const d = data.daily;
  const maxT = Math.max(...d.temperature_2m_max);
  const minT = Math.min(...d.temperature_2m_min);
  const di = nowDayIndex(d.time);
  return (
    <div className="dl-days">
      {d.time.map((iso, i) => {
        if (i < di) return null;
        const info = weatherInfo(d.weather_code[i], 1);
        const Ic = info.Icon;
        const lo = d.temperature_2m_min[i], hi = d.temperature_2m_max[i];
        const left = ((lo - minT) / (maxT - minT || 1)) * 100;
        const width = ((hi - lo) / (maxT - minT || 1)) * 100;
        const p = d.precipitation_probability_max[i];
        return (
          <div className="dl-day" key={iso}>
            <div className="dl-day-name">{i === di ? t.today : dayLabel(iso)}</div>
            <Ic size={24} strokeWidth={2} className="dl-day-ic" />
            <div className="dl-day-p">{p > 10 ? `${p}%` : ""}</div>
            <div className="dl-day-lo">{fTemp(lo, units)}</div>
            <div className="dl-day-bar"><span style={{ left: `${left}%`, width: `${Math.max(width, 8)}%` }} /></div>
            <div className="dl-day-hi">{fTemp(hi, units)}</div>
          </div>
        );
      })}
    </div>
  );
}

function AlertCard({ a, t }) {
  const Ic = a.Icon;
  return (
    <div className="dl-alert" style={{ "--sev": a.sev.color }}>
      <div className="dl-alert-bar" />
      <div className="dl-alert-ic"><Ic size={20} strokeWidth={2.2} /></div>
      <div className="dl-alert-body">
        <div className="dl-alert-head">
          <span className="dl-alert-title">{a.title}</span>
          <span className="dl-alert-sev">{t._lang === "sw" ? a.sev.sw : a.sev.en}</span>
        </div>
        <div className="dl-alert-window"><Clock size={12} /> {a.window}</div>
        <p className="dl-alert-impact">{a.impact}</p>
        <p className="dl-alert-action"><strong>{t.action}:</strong> {a.action}</p>
      </div>
    </div>
  );
}

function AdvisoryCard({ c }) {
  const Ic = c.Icon;
  return (
    <div className={`dl-adv tone-${c.tone}`}>
      <div className="dl-adv-ic"><Ic size={18} strokeWidth={2.1} /></div>
      <div>
        <div className="dl-adv-title">{c.title}</div>
        <p className="dl-adv-body">{c.body}</p>
      </div>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return <button className={`dl-toggle ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on}><span /></button>;
}

function Field({ icon: Ic, ...props }) {
  return (
    <label className="dl-field">
      {Ic && <Ic size={16} className="dl-field-ic" />}
      <input {...props} />
    </label>
  );
}

/* --------------------------------- Trends --------------------------------- */

function TrendsView({ data, units, t, lang }) {
  const d = data.daily;
  const temp = d.time.map((iso, i) => ({
    day: dayLabel(iso),
    hi: units === "imperial" ? round(cToF(d.temperature_2m_max[i])) : round(d.temperature_2m_max[i]),
    lo: units === "imperial" ? round(cToF(d.temperature_2m_min[i])) : round(d.temperature_2m_min[i]),
  }));
  const rain = d.time.map((iso, i) => ({ day: dayLabel(iso), mm: round(d.precipitation_sum[i] || 0) }));
  const di = nowDayIndex(d.time);
  const season = kenyaSeason();
  return (
    <div className="dl-stack">
      <div className="dl-card">
        <div className="dl-card-head"><Thermometer size={16} /> <h3>{t.temp_trend}</h3></div>
        <div className="dl-chart">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={temp} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gHi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sun)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--sun)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gLo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sky)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--sky)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,37,64,.08)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", fontSize: 12 }} />
              <Area type="monotone" dataKey="hi" stroke="var(--sun-ink)" strokeWidth={2.4} fill="url(#gHi)" name={t.high} />
              <Area type="monotone" dataKey="lo" stroke="var(--azure)" strokeWidth={2.4} fill="url(#gLo)" name={t.low} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card-head"><CloudRain size={16} /> <h3>{t.precip_trend}</h3></div>
        <div className="dl-chart">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rain} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,37,64,.08)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} width={36} unit="" />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", fontSize: 12 }} formatter={(v) => [`${v} mm`, t.rain]} />
              <Bar dataKey="mm" radius={[6, 6, 0, 0]}>
                {rain.map((r, i) => <Cell key={i} fill={i === di ? "var(--azure)" : "var(--sky)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dl-card dl-season">
        <div className="dl-card-head"><CalendarDays size={16} /> <h3>{t.season}</h3></div>
        <p>{lang === "sw" ? season.sw : season.en} — {season.tone === "wet"
          ? (lang === "sw" ? "msimu wa mvua nchini Kenya." : "a rainy period across much of Kenya.")
          : (lang === "sw" ? "msimu mkavu kiasi." : "a comparatively dry period.")}</p>
      </div>
    </div>
  );
}

/* ----------------------------- Map (Google + SVG) -------------------------- */

/* Interactive map via Leaflet + OpenStreetMap — free, no API key, no billing.
   Kept the name/props stable so the rest of the app is unchanged. */
function GoogleMapPanel({ current, units, conditions }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const groupRef = useRef(null);

  // Create the map once.
  useEffect(() => {
    if (!ref.current) return undefined;
    const map = L.map(ref.current, { zoomControl: true, attributionControl: true })
      .setView([current?.lat ?? -0.5, current?.lon ?? 37.5], current ? 10 : 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    groupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; groupRef.current = null; };
  }, []);

  // Show ONLY the current location, and smoothly zoom into it on change.
  useEffect(() => {
    const map = mapRef.current, group = groupRef.current;
    if (!map || !group) return;
    group.clearLayers();
    if (current) {
      const c = conditions[current.id];
      const temp = c ? fTemp(c.temp, units) : "";
      const label = `${current.name}${temp ? ` · ${temp}` : ""}`;
      const icon = L.divIcon({
        className: "dl-lpin-wrap",
        html: `<span class="dl-lpin-dot cur"></span><span class="dl-lpin-label">${label}</span>`,
        iconSize: [0, 0], iconAnchor: [9, 9],
      });
      L.marker([current.lat, current.lon], { icon, title: current.name }).addTo(group);
      map.flyTo([current.lat, current.lon], 11, { duration: 1.1 });
    }
    setTimeout(() => map.invalidateSize(), 100);
  }, [current, conditions, units]);

  return <div ref={ref} className="dl-gmap" />;
}

function KenyaMapSVG({ locations, current, conditions, units, onSelect, reason }) {
  const all = useMemo(() => {
    const arr = [...locations];
    if (current && !arr.find((l) => l.id === current.id)) arr.unshift(current);
    return arr;
  }, [locations, current]);
  const W = 360, H = 420;
  const minLon = 33.8, maxLon = 41.9, minLat = -4.8, maxLat = 5.2;
  const px = (lon) => ((lon - minLon) / (maxLon - minLon)) * W;
  const py = (lat) => H - ((lat - minLat) / (maxLat - minLat)) * H;

  return (
    <div className="dl-svgmap-wrap">
      {reason && (
        <div className="dl-map-note">
          <Info size={13} /> {reason === "no-key"
            ? "Add a Google Maps API key in Settings for the live map. Showing the Kenya overview."
            : "Google Maps couldn't load here — showing the Kenya overview instead."}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="dl-svgmap" role="img" aria-label="Map of Kenya">
        <defs>
          <radialGradient id="land" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#EAF6FF" /><stop offset="100%" stopColor="#CFE8FB" />
          </radialGradient>
        </defs>
        <path fill="url(#land)" stroke="var(--azure)" strokeWidth="1.4" strokeOpacity="0.5"
          d="M70 38 L150 30 L208 42 L243 30 L300 70 L322 120 L300 150 L320 215 L300 250 L325 300 L300 340 L250 360 L235 392 L150 392 L120 350 L70 330 L55 250 L40 190 L55 120 Z" />
        {all.map((l) => {
          const c = conditions[l.id];
          const info = c ? weatherInfo(c.code, c.isDay) : null;
          const Ic = info?.Icon;
          const isCur = current && l.id === current.id;
          const x = px(l.lon), y = py(l.lat);
          return (
            <g key={l.id} transform={`translate(${x},${y})`} className="dl-pin" onClick={() => onSelect(l)} style={{ cursor: "pointer" }}>
              <circle r={isCur ? 9 : 6} fill={isCur ? "var(--azure)" : "var(--sky)"} stroke="#fff" strokeWidth="2" />
              {c && <text x="10" y="-6" className="dl-pin-temp">{fTemp(c.temp, units)}</text>}
              <text x="10" y="8" className="dl-pin-name">{l.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MapView({ saved, current, conditions, units, t, lang, onSelect, onFocus }) {
  return (
    <div className="dl-stack">
      <div className="dl-card dl-map-card">
        <div className="dl-card-head"><MapIcon size={20} /> <h3>{t.map_t}</h3></div>
        <LocationSearch t={t} onPick={onFocus} />
        <GoogleMapPanel current={current} conditions={conditions} units={units} />
      </div>
      <div className="dl-card">
        <div className="dl-card-head"><MapPin size={20} /> <h3>{t.saved}</h3></div>
        <div className="dl-loclist">
          {(current ? [current, ...saved.filter((l) => l.id !== current.id)] : saved).map((l) => {
            const c = conditions[l.id];
            const info = c ? weatherInfo(c.code, c.isDay) : null;
            const Ic = info?.Icon || Cloud;
            return (
              <button key={l.id} className={`dl-locrow ${current && l.id === current.id ? "active" : ""}`} onClick={() => onSelect(l)}>
                <Ic size={22} strokeWidth={2} />
                <div className="dl-locrow-main"><span>{l.name}</span><small>{l.region}</small></div>
                <span className="dl-locrow-temp">{c ? fTemp(c.temp, units) : "—"}</span>
                <ChevronRight size={18} className="dl-locrow-go" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Notifications / SMS --------------------------- */

function NotificationsView({ me, updateMe, t, lang }) {
  const [raw, setRaw] = useState("");
  const [err, setErr] = useState("");
  const [pushState, setPushState] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const phones = me.phones || [];
  const notify = me.notify || DEFAULT_NOTIFY;
  const smsEndpoint = me.smsEndpoint || ENV_SMS_ENDPOINT;

  const addPhone = () => {
    const n = normalizePhone(raw);
    if (!n.ok) { setErr(n.reason); return; }
    if (phones.find((p) => p.number === n.value)) { setErr("already added"); return; }
    const next = [...phones, { id: Date.now(), number: n.value, verified: false, primary: phones.length === 0 }];
    updateMe({ phones: next });
    setRaw(""); setErr("");
  };
  const verify = (id) => updateMe({ phones: phones.map((p) => p.id === id ? { ...p, verified: true } : p) });
  const makePrimary = (id) => updateMe({ phones: phones.map((p) => ({ ...p, primary: p.id === id })) });
  const remove = (id) => {
    const next = phones.filter((p) => p.id !== id);
    if (next.length && !next.find((p) => p.primary)) next[0].primary = true;
    updateMe({ phones: next });
  };
  const setN = (k, v) => updateMe({ notify: { ...notify, [k]: v } });

  const enablePush = async () => {
    if (typeof Notification === "undefined") return;
    const res = await Notification.requestPermission();
    setPushState(res);
    setN("push", res === "granted");
    if (res === "granted") {
      try { new Notification("Dalili", { body: lang === "sw" ? "Arifa za papo zimewashwa." : "Push notifications enabled." }); } catch {}
    }
  };

  const sendTest = (sev) => {
    const primary = phones.find((p) => p.primary) || phones[0];
    if (!primary) return;
    sendSMS({
      endpoint: smsEndpoint, to: primary.number,
      message: lang === "sw"
        ? `DALILI: Jaribio la tahadhari (${sev}). Hali ya hewa ya eneo lako.`
        : `DALILI: Test alert (${sev}). Hyperlocal weather for your area.`,
    }).then((r) => {
      const out = [{ id: Date.now(), to: primary.number, sev, ...r }, ...(me.smsOutbox || [])].slice(0, 20);
      updateMe({ smsOutbox: out });
    });
  };

  return (
    <div className="dl-stack">
      <div className="dl-card">
        <div className="dl-card-head"><BellRing size={16} /> <h3>{t.push}</h3></div>
        <div className="dl-row-between">
          <p className="dl-muted" style={{ margin: 0 }}>
            {pushState === "granted" ? (lang === "sw" ? "Zimewashwa kwenye kifaa hiki." : "Enabled on this device.")
              : pushState === "denied" ? (lang === "sw" ? "Zimezuiwa katika kivinjari." : "Blocked in your browser settings.")
              : (lang === "sw" ? "Washa arifa kwenye kivinjari hiki." : "Turn on alerts in this browser.")}
          </p>
          <button className="dl-btn sm" onClick={enablePush} disabled={pushState === "denied"}>
            {pushState === "granted" ? <Check size={15} /> : <BellRing size={15} />}
            {pushState === "granted" ? t.saved_ok : (lang === "sw" ? "Washa" : "Enable")}
          </button>
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card-head"><Phone size={16} /> <h3>{lang === "sw" ? "Nambari za simu (SMS)" : "Phone numbers (SMS)"}</h3></div>
        <p className="dl-muted">{lang === "sw"
          ? "Ongeza nambari za Kenya kupokea tahadhari kwa SMS kupitia Africa's Talking."
          : "Add Kenyan numbers to receive SMS alerts via Africa's Talking."}</p>
        <div className="dl-addrow">
          <Field icon={Smartphone} value={raw} placeholder="07XX XXX XXX  ·  +2547XXXXXXXX"
            onChange={(e) => { setRaw(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && addPhone()} inputMode="tel" />
          <button className="dl-btn" onClick={addPhone}><Plus size={16} /> {t.add}</button>
        </div>
        {err && <div className="dl-inline-err"><AlertTriangle size={13} /> {err}</div>}

        <div className="dl-phones">
          {phones.length === 0 && <div className="dl-empty sm">{lang === "sw" ? "Hakuna nambari bado." : "No numbers yet."}</div>}
          {phones.map((p) => (
            <div className="dl-phone" key={p.id}>
              <Smartphone size={17} className="dl-phone-ic" />
              <div className="dl-phone-main">
                <span className="dl-phone-num">{p.number}</span>
                <span className="dl-phone-tags">
                  {p.primary && <em className="tag primary"><Star size={11} /> {lang === "sw" ? "Kuu" : "Primary"}</em>}
                  {p.verified ? <em className="tag ok"><ShieldCheck size={11} /> {lang === "sw" ? "Imethibitishwa" : "Verified"}</em>
                    : <em className="tag warn">{lang === "sw" ? "Haijathibitishwa" : "Unverified"}</em>}
                </span>
              </div>
              <div className="dl-phone-actions">
                {!p.verified && <button className="dl-icbtn" title="Verify (demo)" onClick={() => verify(p.id)}><ShieldCheck size={15} /></button>}
                {!p.primary && <button className="dl-icbtn" title="Make primary" onClick={() => makePrimary(p.id)}><Star size={15} /></button>}
                <button className="dl-icbtn danger" title="Remove" onClick={() => remove(p.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card-head"><Send size={16} /> <h3>{lang === "sw" ? "Ni tahadhari zipi kwa SMS?" : "Which alerts go to SMS?"}</h3></div>
        <div className="dl-prefrows">
          {[
            ["smsNotice", lang === "sw" ? "Taarifa" : "Notice", "var(--sky)"],
            ["smsWatch", lang === "sw" ? "Tahadhari" : "Watch", "var(--amber)"],
            ["smsWarning", lang === "sw" ? "Onyo" : "Warning", "var(--ember)"],
          ].map(([k, label, color]) => (
            <div className="dl-prefrow" key={k}>
              <span className="dl-dot" style={{ background: color }} /> <span>{label}</span>
              <Toggle on={!!notify[k]} onClick={() => setN(k, !notify[k])} />
            </div>
          ))}
        </div>
        <div className="dl-divider" />
        <div className="dl-row-between">
          <button className="dl-btn ghost sm" onClick={() => sendTest("Watch")} disabled={!phones.length}>
            <Send size={14} /> {lang === "sw" ? "Tuma jaribio" : "Send test SMS"}
          </button>
          <span className="dl-muted sm">{lang === "sw" ? "Inatuma kupitia" : "Sending via"} <code>{smsEndpoint}</code></span>
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card-head"><Inbox size={16} /> <h3>{lang === "sw" ? "SMS zilizotumwa" : "SMS outbox"}</h3></div>
        <div className="dl-outbox">
          {(me.smsOutbox || []).length === 0 && <div className="dl-empty sm">{lang === "sw" ? "Hakuna SMS bado." : "No messages sent yet."}</div>}
          {(me.smsOutbox || []).map((m) => (
            <div className="dl-outrow" key={m.id}>
              <span className={`dl-outdot ${m.simulated ? "sim" : m.ok === false ? "fail" : "live"}`} />
              <div className="dl-outmain">
                <span className="dl-outto">{m.to}</span>
                <small>{m.simulated
                  ? (lang === "sw" ? "Imeigwa (hakuna seva)" : "Simulated (no backend)")
                  : m.ok === false
                    ? (lang === "sw" ? "Imeshindwa (angalia seva)" : "Failed (check backend)")
                    : (lang === "sw" ? "Imetumwa" : "Sent")} · {m.sev}</small>
              </div>
              <time>{new Date(m.id).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* SMS sender: POSTs to a backend endpoint if configured; simulates otherwise.
   Browsers can't call Africa's Talking directly (no CORS, secret API key),
   so production routes through your Django/serverless function. */
async function sendSMS({ endpoint, to, message }) {
  if (!endpoint) return { simulated: true, ok: true };
  try {
    const res = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message }),
    });
    return { simulated: false, ok: res.ok };
  } catch {
    return { simulated: false, ok: false };
  }
}

/* -------------------------------- Settings -------------------------------- */

function SettingsView({ me, updateMe, lang, setLang, t, onLogout, account }) {
  const role = me.role;
  const units = me.units;
  const th = me.thresholds || DEFAULT_THRESHOLDS;
  const [draft, setDraft] = useState(th);
  const [keyDraft, setKeyDraft] = useState(me.mapsKey || "");
  const [epDraft, setEpDraft] = useState(me.smsEndpoint || "");
  useEffect(() => setDraft(th), [me.email]);
  const saveTh = () => updateMe({ thresholds: draft });

  return (
    <div className="dl-stack">
      <div className="dl-card">
        <div className="dl-card-head"><User size={16} /> <h3>{t.role}</h3></div>
        <div className="dl-account">
          <div className="dl-avatar">{(account?.name || "U").slice(0, 1).toUpperCase()}</div>
          <div><div className="dl-account-name">{account?.name}</div><div className="dl-muted sm">{account?.email}</div></div>
          <button className="dl-btn ghost sm" onClick={onLogout}><LogOut size={14} /> {lang === "sw" ? "Toka" : "Log out"}</button>
        </div>
        <div className="dl-role-grid">
          {ROLES.map((r) => { const Ic = r.Icon; return (
            <button key={r.id} className={`dl-rolechip ${role === r.id ? "on" : ""}`} onClick={() => updateMe({ role: r.id })}>
              <Ic size={16} /> {lang === "sw" ? r.sw : r.en}
            </button>
          ); })}
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card-head"><Globe size={16} /> <h3>{t.language} · {t.units}</h3></div>
        <div className="dl-seg">
          <button className={lang === "en" ? "on" : ""} onClick={() => { setLang("en"); updateMe({ lang: "en" }); }}>English</button>
          <button className={lang === "sw" ? "on" : ""} onClick={() => { setLang("sw"); updateMe({ lang: "sw" }); }}>Kiswahili</button>
        </div>
        <div className="dl-seg" style={{ marginTop: 10 }}>
          <button className={units === "metric" ? "on" : ""} onClick={() => updateMe({ units: "metric" })}>°C · km/h</button>
          <button className={units === "imperial" ? "on" : ""} onClick={() => updateMe({ units: "imperial" })}>°F · mph</button>
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card-head"><Moon size={16} /> <h3>{t.appearance}</h3></div>
        <div className="dl-seg">
          {[["light", t.theme_light, Sun], ["dark", t.theme_dark, Moon], ["auto", t.theme_auto, Smartphone]].map(([val, label, Ic]) => (
            <button key={val} className={(me.theme || "auto") === val ? "on" : ""} onClick={() => updateMe({ theme: val })}>
              <Ic size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="dl-card">
        <div className="dl-card-head"><AlertTriangle size={16} /> <h3>{t.thresholds}</h3></div>
        <div className="dl-th">
          <ThRow label={t.rain_th} value={draft.rain} step={0.5} min={1} max={30} onChange={(v) => setDraft({ ...draft, rain: v })} />
          <ThRow label={t.wind_th} value={draft.wind} step={5} min={20} max={100} onChange={(v) => setDraft({ ...draft, wind: v })} />
          <ThRow label={t.heat_th} value={draft.heat} step={1} min={25} max={45} onChange={(v) => setDraft({ ...draft, heat: v })} />
          <ThRow label={t.uv_th} value={draft.uv} step={1} min={4} max={12} onChange={(v) => setDraft({ ...draft, uv: v })} />
        </div>
        <button className="dl-btn" style={{ marginTop: 12 }} onClick={saveTh}><Check size={15} /> {t.save}</button>
      </div>

      <div className="dl-card">
        <div className="dl-card-head"><MapIcon size={18} /> <h3>{lang === "sw" ? "Ramani" : "Map"}</h3></div>
        <p className="dl-muted" style={{ margin: 0 }}>{lang === "sw"
          ? "Ramani hai inatumia OpenStreetMap — bila ufunguo, bila malipo. Hakuna cha kusanidi."
          : "The live map uses OpenStreetMap — no API key and no billing required. Nothing to configure."}</p>
      </div>

      <div className="dl-card">
        <div className="dl-card-head"><Send size={16} /> <h3>{lang === "sw" ? "Seva ya SMS" : "SMS backend"}</h3></div>
        <p className="dl-muted">{lang === "sw"
          ? "URL ya kazi yako ya Africa's Talking (Django/serverless). Bila hii, SMS huigwa."
          : "URL of your Africa's Talking send function (Django/serverless). Without it, SMS is simulated."}</p>
        <div className="dl-addrow">
          <Field icon={Send} value={epDraft} placeholder="https://api.yourbackend.com/sms" onChange={(e) => setEpDraft(e.target.value)} />
          <button className="dl-btn" onClick={() => updateMe({ smsEndpoint: epDraft.trim() })}><Check size={16} /> {t.save}</button>
        </div>
      </div>

      <div className="dl-card dl-about">
        <div className="dl-card-head"><Info size={16} /> <h3>{t.about}</h3></div>
        <p>Dalili — {lang === "sw" ? "tahadhari za hali ya hewa za eneo lako kwa Kenya" : "hyperlocal weather alerts for Kenya"}. BAC-2202.</p>
        <p className="dl-muted sm">{lang === "sw" ? "Data hai: Open-Meteo. Ramani: OpenStreetMap. SMS: Africa's Talking." : "Live data: Open-Meteo. Maps: OpenStreetMap. SMS: Africa's Talking."}</p>
      </div>
    </div>
  );
}

function ThRow({ label, value, onChange, step, min, max }) {
  return (
    <div className="dl-throw">
      <div className="dl-throw-top"><span>{label}</span><b>{value}</b></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}

/* -------------------------------- Brand ----------------------------------- */

function Brand({ compact }) {
  return (
    <div className={`dl-brand ${compact ? "compact" : ""}`}>
      <div className="dl-logo"><CloudSun size={compact ? 20 : 24} strokeWidth={2.2} /></div>
      <div className="dl-brand-text">
        <span className="dl-brand-name">Dalili</span>
        {!compact && <span className="dl-brand-tag">Soma anga, panga vyema</span>}
      </div>
    </div>
  );
}

/* Loading / intro splash — Lottie animation (web component loaded in index.html). */
function Intro({ lang }) {
  return (
    <div className="dl-intro">
      <div
        className="dl-intro-anim"
        dangerouslySetInnerHTML={{
          __html:
            '<lottie-player src="https://lottie.host/aa9e47ff-b67e-4beb-a386-6e3c77c5fe47/cLksQXG8LV.json" background="transparent" speed="1" style="width:min(60vw,260px);height:min(60vw,260px)" autoplay loop></lottie-player>',
        }}
      />
      <div className="dl-intro-brand">Dalili</div>
      <div className="dl-intro-tag">{lang === "sw" ? "Soma anga, panga vyema" : "Reading the sky…"}</div>
    </div>
  );
}

/* ------------------------------- Auth screen ------------------------------ */

function AuthScreen({ lang, setLang, accounts, onRegister, onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const S = lang === "sw";

  const submit = () => {
    setErr("");
    if (mode === "register") {
      if (!name.trim()) return setErr(S ? "Weka jina." : "Enter your name.");
      if (!isEmail(email)) return setErr(S ? "Barua pepe si sahihi." : "Enter a valid email.");
      if (pw.length < 6) return setErr(S ? "Nenosiri lazima liwe na herufi 6+." : "Password must be 6+ characters.");
      if (pw !== pw2) return setErr(S ? "Manenosiri hayalingani." : "Passwords don't match.");
      if (accounts.find((a) => a.email === email.trim().toLowerCase())) return setErr(S ? "Akaunti tayari ipo." : "Account already exists.");
      onRegister({ name: name.trim(), email: email.trim().toLowerCase(), password: pw });
    } else {
      const acc = accounts.find((a) => a.email === email.trim().toLowerCase());
      if (!acc || acc.password !== pw) return setErr(S ? "Barua pepe au nenosiri si sahihi." : "Wrong email or password.");
      onLogin(acc.email);
    }
  };

  return (
    <div className="dl-auth">
      <div className="dl-auth-sky">
        <span className="dl-sun-glow" /><span className="dl-sun-core" />
        <span className="dl-cloud c1" /><span className="dl-cloud c2" /><span className="dl-cloud c3" />
      </div>
      <div className="dl-auth-card">
        <Brand />
        <h1 className="dl-auth-h">{mode === "register" ? (S ? "Fungua akaunti" : "Create your account") : (S ? "Karibu tena" : "Welcome back")}</h1>
        <p className="dl-auth-sub">{S ? "Hifadhi maeneo, viwango na nambari zako za SMS." : "Save your places, thresholds and SMS numbers."}</p>

        <div className="dl-auth-fields">
          {mode === "register" && <Field icon={User} value={name} placeholder={S ? "Jina kamili" : "Full name"} onChange={(e) => setName(e.target.value)} />}
          <Field icon={Mail} type="email" value={email} placeholder={S ? "Barua pepe" : "Email"} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && mode === "login" && submit()} />
          <Field icon={Lock} type="password" value={pw} placeholder={S ? "Nenosiri" : "Password"} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && mode === "login" && submit()} />
          {mode === "register" && <Field icon={Lock} type="password" value={pw2} placeholder={S ? "Thibitisha nenosiri" : "Confirm password"} onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />}
        </div>

        {err && <div className="dl-inline-err"><AlertTriangle size={13} /> {err}</div>}

        <button className="dl-btn block" onClick={submit}>
          {mode === "register" ? <><UserPlus size={16} /> {S ? "Fungua akaunti" : "Create account"}</> : <><LogIn size={16} /> {S ? "Ingia" : "Log in"}</>}
        </button>

        <div className="dl-auth-switch">
          {mode === "register"
            ? <>{S ? "Una akaunti tayari?" : "Already have an account?"} <button onClick={() => { setMode("login"); setErr(""); }}>{S ? "Ingia" : "Log in"}</button></>
            : <>{S ? "Mpya hapa?" : "New here?"} <button onClick={() => { setMode("register"); setErr(""); }}>{S ? "Fungua akaunti" : "Create one"}</button></>}
        </div>

        <div className="dl-auth-demo">
          <button onClick={() => onLogin("demo@dalili.ke")}><KeyRound size={13} /> {S ? "Jaribu kwa akaunti ya mfano" : "Try the demo account"}</button>
        </div>

        <div className="dl-auth-lang">
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
          <button className={lang === "sw" ? "on" : ""} onClick={() => setLang("sw")}>SW</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Onboarding ------------------------------- */

function Onboarding({ lang, setLang, onDone }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("mtumiaji");
  const [loc, setLoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [q, setQ] = useState("");
  const t = STR[lang];

  const detect = () => {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        const j = await r.json();
        setLoc({ id: "current", name: j.city || j.locality || "My location", region: j.principalSubdivision || "Kenya", lat: latitude, lon: longitude });
      } catch {
        setLoc({ id: "current", name: "My location", region: "Kenya", lat: latitude, lon: longitude });
      }
      setBusy(false);
    }, () => setBusy(false), { timeout: 8000 });
  };

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    let alive = true;
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
        const j = await r.json();
        const ke = (j.results || []).filter((x) => x.country_code === "KE")
          .map((x) => ({ id: `geo-${x.id}`, name: x.name, region: x.admin1 || "Kenya", lat: x.latitude, lon: x.longitude }));
        if (alive) setResults(ke);
      } catch { if (alive) setResults([]); }
    }, 300);
    return () => { alive = false; clearTimeout(id); };
  }, [q]);

  return (
    <div className="dl-onboard">
      <div className="dl-onboard-sky"><span className="dl-sun-glow" /><span className="dl-sun-core" /><span className="dl-cloud c1" /><span className="dl-cloud c2" /></div>
      <div className="dl-onboard-card">
        <Brand />
        {step === 0 && (
          <>
            <h2>{t.welcome}</h2>
            <p className="dl-muted">{t.choose} · {t.detect}</p>
            <button className="dl-btn block" onClick={detect} disabled={busy}>
              {busy ? <Loader2 size={16} className="dl-spin" /> : <Crosshair size={16} />} {t.detect}
            </button>
            <div className="dl-or"><span>{lang === "sw" ? "au" : "or"}</span></div>
            <Field icon={Search} value={q} placeholder={t.search_place} onChange={(e) => setQ(e.target.value)} />
            <div className="dl-search-res">
              {results.map((r) => (
                <button key={r.id} className="dl-search-row" onClick={() => { setLoc(r); setQ(r.name); setResults([]); }}>
                  <MapPin size={15} /> <span>{r.name}</span><small>{r.region}</small>
                </button>
              ))}
              {q.trim().length < 2 && LOCATIONS.slice(0, 6).map((r) => (
                <button key={r.id} className="dl-search-row" onClick={() => { setLoc(r); }}>
                  <MapPin size={15} /> <span>{r.name}</span><small>{r.region}</small>
                </button>
              ))}
            </div>
            {loc && <div className="dl-chosen"><Check size={15} /> {loc.name}, {loc.region}</div>}
            <button className="dl-btn block" disabled={!loc} onClick={() => setStep(1)} style={{ marginTop: 12 }}>
              {t.continue} <ChevronRight size={16} />
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <h2>{t.pick_role}</h2>
            <p className="dl-muted">{t.pick_role_sub}</p>
            <div className="dl-role-grid big">
              {ROLES.map((r) => { const Ic = r.Icon; return (
                <button key={r.id} className={`dl-rolechip ${role === r.id ? "on" : ""}`} onClick={() => setRole(r.id)}>
                  <Ic size={18} /> {lang === "sw" ? r.sw : r.en}
                </button>
              ); })}
            </div>
            <button className="dl-btn block" onClick={() => onDone({ role, loc })} style={{ marginTop: 14 }}>
              {t.continue} <ChevronRight size={16} />
            </button>
          </>
        )}
        <div className="dl-auth-lang">
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
          <button className={lang === "sw" ? "on" : ""} onClick={() => setLang("sw")}>SW</button>
        </div>
      </div>
    </div>
  );
}

/* ============================== Root component ============================= */

const seededAccounts = [{ name: "Demo User", email: "demo@dalili.ke", password: "demo1234" }];
const freshUserData = () => ({
  onboarded: false, role: "mtumiaji", units: "metric", lang: "en", theme: "auto",
  location: LOCATIONS[0], savedIds: ["nairobi", "mombasa", "kisumu", "nakuru"],
  thresholds: DEFAULT_THRESHOLDS, notify: DEFAULT_NOTIFY, phones: [], smsOutbox: [],
  mapsKey: "", smsEndpoint: "",
});

/* ----------------------------- Configuration ------------------------------ */
/* Read at build time from a .env file (see .env.example). Optional — the app
   runs fully without them: no Maps key → Kenya SVG map; no SMS endpoint →
   alerts route to the default /api/sms backend function (server/index.js). */
const ENV_MAPS_KEY = (import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) || "";
const ENV_SMS_ENDPOINT = (import.meta.env && import.meta.env.VITE_SMS_ENDPOINT) || "/api/sms";

/* ---------------------------- Local persistence --------------------------- */
/* Accounts + per-user data + session persist across reloads in localStorage.
   NOTE: this is demo-grade auth for the academic build. In production, move
   authentication to Firebase Auth or the Django backend and NEVER store
   plaintext passwords client-side. The data shape here maps 1:1 to the
   User / Preference / Subscription entities in the SRS, so swapping the
   storage layer for a REST/Firestore call is a localized change. */
const STORE_KEY = "dalili:v1";
function loadPersisted() {
  const fallback = {
    lang: "en",
    accounts: seededAccounts,
    userData: { "demo@dalili.ke": { ...freshUserData(), onboarded: true, role: "mkulima" } },
    sessionEmail: null,
  };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    // Always keep the demo account available even after a user registers.
    const accounts = saved.accounts && saved.accounts.length ? saved.accounts : fallback.accounts;
    if (!accounts.find((a) => a.email === "demo@dalili.ke")) accounts.unshift(seededAccounts[0]);
    return {
      lang: saved.lang || "en",
      accounts,
      userData: { ...fallback.userData, ...(saved.userData || {}) },
      sessionEmail: saved.sessionEmail || null,
    };
  } catch {
    return fallback;
  }
}
function savePersisted(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

export default function App() {
  const initial = useMemo(() => loadPersisted(), []);
  const [lang, setLang] = useState(initial.lang);
  const [accounts, setAccounts] = useState(initial.accounts);
  const [userData, setUserData] = useState(initial.userData);
  const [sessionEmail, setSessionEmail] = useState(initial.sessionEmail);

  // weather + ui
  const [view, setView] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [conditions, setConditions] = useState({});
  const [previewRole, setPreviewRole] = useState(null);
  const [booting, setBooting] = useState(true); // show the intro/loading splash

  const me = sessionEmail ? userData[sessionEmail] : null;
  const account = sessionEmail ? accounts.find((a) => a.email === sessionEmail) : null;
  const t = useMemo(() => ({ ...STR[lang], _lang: lang }), [lang]);

  // Persist accounts, per-user data, the active session and language.
  useEffect(() => {
    savePersisted({ lang, accounts, userData, sessionEmail });
  }, [lang, accounts, userData, sessionEmail]);

  // Loading/intro splash on first load.
  useEffect(() => {
    const id = setTimeout(() => setBooting(false), 2800);
    return () => clearTimeout(id);
  }, []);

  // Dark mode: apply the user's theme (light/dark/auto) to <html data-theme>.
  const theme = me?.theme || "auto";
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "auto" ? (mq.matches ? "dark" : "light") : theme;
      root.setAttribute("data-theme", resolved);
    };
    apply();
    if (theme === "auto") {
      mq.addEventListener?.("change", apply);
      return () => mq.removeEventListener?.("change", apply);
    }
    return undefined;
  }, [theme]);

  const updateMe = useCallback((patch) => {
    setUserData((prev) => ({ ...prev, [sessionEmail]: { ...prev[sessionEmail], ...patch } }));
  }, [sessionEmail]);

  const location = me?.location || LOCATIONS[0];
  const units = me?.units || "metric";

  const savedLocs = useMemo(() => {
    if (!me) return [];
    const base = LOCATIONS.filter((l) => (me.savedIds || []).includes(l.id));
    if (location.id === "current" && !base.find((b) => b.id === "current")) return [location, ...base];
    return base;
  }, [me, location]);

  // Every marker to show on the map: the active location + all saved places +
  // the full set of Kenyan towns, de-duplicated. This makes the Map view a real
  // country-wide map rather than just the handful of saved pins.
  const mapLocations = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const l of [location, ...savedLocs, ...LOCATIONS]) {
      if (l && !seen.has(l.id)) { seen.add(l.id); out.push(l); }
    }
    return out;
  }, [location, savedLocs]);

  const fetchWeather = useCallback(async (loc) => {
    setLoading(true); setError(false);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,` +
      `surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,is_day` +
      `&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,visibility,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,` +
      `wind_speed_10m_max,uv_index_max,sunrise,sunset` +
      `&timezone=Africa%2FNairobi&past_days=7&forecast_days=7`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("bad");
      setData(await res.json()); setLoading(false);
    } catch (e) { setError(true); setLoading(false); }
  }, []);

  useEffect(() => { if (me?.onboarded) fetchWeather(location); }, [location.id, location.lat, me?.onboarded, fetchWeather]);

  useEffect(() => {
    if (!me?.onboarded) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(savedLocs.map(async (l) => {
        try {
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lon}&current=temperature_2m,weather_code,is_day&timezone=Africa%2FNairobi`);
          const j = await r.json();
          return [l.id, { temp: j.current.temperature_2m, code: j.current.weather_code, isDay: j.current.is_day }];
        } catch { return [l.id, null]; }
      }));
      if (!cancelled) setConditions((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
    return () => { cancelled = true; };
  }, [savedLocs, me?.onboarded]);

  const alerts = useMemo(() => buildAlerts(data, me?.thresholds || DEFAULT_THRESHOLDS, lang), [data, me, lang]);
  const sign = useMemo(() => daliliSign(data, lang), [data, lang]);
  const activeRole = previewRole || me?.role || "mtumiaji";
  const advisories = useMemo(() => advisoriesFor(activeRole, data, lang), [activeRole, data, lang]);

  /* Auto-refresh the active location every 15 minutes (SRS FR-13). */
  useEffect(() => {
    if (!me?.onboarded) return undefined;
    const id = setInterval(() => fetchWeather(location), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [me?.onboarded, location.id, location.lat, fetchWeather]);

  /* Persist raised alerts to a rolling 30-day history log (SRS FR-43).
     Deduplicated per alert-type + location + hour so the same condition isn't
     logged repeatedly while it persists. */
  useEffect(() => {
    if (!me?.onboarded || !alerts.length) return;
    const hourKey = new Date().toISOString().slice(0, 13);
    const existing = me.alertHistory || [];
    const have = new Set(existing.map((e) => e.key));
    const additions = [];
    for (const a of alerts) {
      const key = `${a.id}-${location.id}-${hourKey}`;
      if (!have.has(key)) {
        additions.push({
          key, type: a.id, sevColor: a.sev.color, sevEn: a.sev.en, sevSw: a.sev.sw,
          title: a.title, impact: a.impact, window: a.window, loc: location.name, ts: Date.now(),
        });
      }
    }
    if (additions.length) {
      const merged = [...additions, ...existing]
        .filter((e) => Date.now() - e.ts < 30 * 24 * 3600 * 1000)
        .slice(0, 60);
      updateMe({ alertHistory: merged });
    }
  }, [alerts, location.id, location.name, me, updateMe]);

  /* ---- gates ---- */
  if (booting) {
    return (<><StyleTag /><Intro lang={lang} /></>);
  }
  if (!sessionEmail) {
    return (<><StyleTag /><AuthScreen lang={lang} setLang={setLang} accounts={accounts}
      onRegister={(acc) => { setAccounts((p) => [...p, acc]); setUserData((p) => ({ ...p, [acc.email]: freshUserData() })); setSessionEmail(acc.email); }}
      onLogin={(email) => { setSessionEmail(email); const u = userData[email]; if (u?.lang) setLang(u.lang); }} /></>);
  }
  if (!me.onboarded) {
    return (<><StyleTag /><Onboarding lang={lang} setLang={setLang}
      onDone={({ role, loc }) => updateMe({ role, location: loc || LOCATIONS[0], onboarded: true })} /></>);
  }

  const cur = data?.current;
  const di = data ? nowDayIndex(data.daily.time) : 0;
  const info = cur ? weatherInfo(cur.weather_code, cur.is_day) : null;
  const scene = info?.scene || "clear-day";
  const sceneStyle = SCENES[scene];

  const selectLocation = (loc) => { updateMe({ location: loc }); setView("dashboard"); setNavOpen(false); };
  // Set the active location but stay on the Map (used by search + map markers).
  const focusLocation = (loc) => { updateMe({ location: loc }); setNavOpen(false); };
  const onLogout = () => { setSessionEmail(null); setData(null); setView("dashboard"); setPreviewRole(null); };

  const curUv = data ? (data.daily.uv_index_max?.[di] ?? 0) : 0;

  return (
    <div className={`dl-root ${sceneStyle.soft ? "soft" : ""}`}>
      <StyleTag />

      {/* Sidebar (desktop) */}
      <aside className={`dl-side ${navOpen ? "open" : ""}`}>
        <Brand />
        <nav>
          {NAV.map((n) => { const Ic = n.Icon; return (
            <button key={n.id} className={`dl-navbtn ${view === n.id ? "on" : ""}`} onClick={() => { setView(n.id); setNavOpen(false); }}>
              <Ic size={18} /> <span>{lang === "sw" ? n.sw : n.en}</span>
              {n.id === "alerts" && alerts.length > 0 && <em className="dl-badge">{alerts.length}</em>}
            </button>
          ); })}
        </nav>
        <div className="dl-side-foot">
          <div className="dl-avatar sm">{(account?.name || "U").slice(0, 1).toUpperCase()}</div>
          <div className="dl-side-acc"><span>{account?.name}</span><small>{lang === "sw" ? ROLES.find((r) => r.id === me.role)?.sw : ROLES.find((r) => r.id === me.role)?.en}</small></div>
          <button className="dl-icbtn" title="Log out" onClick={onLogout}><LogOut size={16} /></button>
        </div>
      </aside>
      {navOpen && <div className="dl-scrim" onClick={() => setNavOpen(false)} />}

      {/* Main */}
      <main className="dl-main">
        <header className="dl-top">
          <button className="dl-burger" onClick={() => setNavOpen(true)} aria-label="Menu"><Menu size={20} /></button>
          <button className="dl-locbtn" onClick={() => setView("map")}>
            <MapPin size={15} /> <span>{location.name}</span><small>{location.region}</small>
          </button>
          <div className="dl-top-actions">
            <button className="dl-icbtn" title={t.refresh} onClick={() => fetchWeather(location)}><RefreshCw size={16} className={loading ? "dl-spin" : ""} /></button>
            <button className="dl-seg-mini">
              <span className={lang === "en" ? "on" : ""} onClick={() => { setLang("en"); updateMe({ lang: "en" }); }}>EN</span>
              <span className={lang === "sw" ? "on" : ""} onClick={() => { setLang("sw"); updateMe({ lang: "sw" }); }}>SW</span>
            </button>
          </div>
        </header>

        <div className="dl-content">
          {loading && !data && <div className="dl-loading"><Loader2 size={26} className="dl-spin" /><p>{t.loading}</p></div>}
          {error && <div className="dl-error"><AlertTriangle size={26} /><p>{t.err}</p><button className="dl-btn" onClick={() => fetchWeather(location)}>{t.retry}</button></div>}

          {data && !error && (
            <>
              {view === "dashboard" && (
                <div className="dl-stack">
                  {/* Location search sits above the weather window */}
                  <LocationSearch t={t} onPick={focusLocation} />
                  <div className="dl-hero" style={{ background: sceneStyle.grad, color: sceneStyle.text }}>
                    <LivingSky scene={scene} info={info} cur={cur} units={units} t={t} di={di} data={data} location={location} />
                  </div>

                  {sign && (
                    <div className={`dl-sign tone-${sign.tone}`}>
                      <sign.Icon size={18} /> <span>{lang === "sw" ? sign.sw : sign.en}</span>
                      <button className="dl-sign-go" onClick={() => setView("advice")}>{t.open_advice} <ChevronRight size={14} /></button>
                    </div>
                  )}

                  <div className="dl-metrics">
                    <Metric Icon={Wind} label={t.wind} value={fWind(cur.wind_speed_10m, units)} sub={`${compass(cur.wind_direction_10m)}`} />
                    <Metric Icon={Droplets} label={t.humidity} value={`${round(cur.relative_humidity_2m)}%`} />
                    <Metric Icon={Sun} label={t.uv} value={round(curUv)} sub={uvBand(curUv)} />
                    <Metric Icon={Gauge} label={t.pressure} value={`${round(cur.surface_pressure)}`} sub="hPa" />
                    <Metric Icon={Eye} label={t.visibility} value={cur.visibility != null ? `${round(cur.visibility / 1000)}` : "—"} sub="km" />
                    <Metric Icon={CloudRain} label={t.rain} value={`${(cur.precipitation || 0).toFixed(1)}`} sub="mm" />
                  </div>

                  <div className="dl-card">
                    <div className="dl-card-head"><Clock size={16} /> <h3>{t.hourly}</h3></div>
                    <HourlyStrip data={data} units={units} />
                  </div>

                  <div className="dl-card">
                    <div className="dl-card-head"><CalendarDays size={16} /> <h3>{t.daily}</h3></div>
                    <DailyList data={data} units={units} t={t} />
                  </div>

                  {alerts.length > 0 && (
                    <div className="dl-card">
                      <div className="dl-card-head"><BellRing size={16} /> <h3>{t.active_alerts}</h3><span className="dl-count">{alerts.length}</span></div>
                      <div className="dl-alerts">{alerts.slice(0, 2).map((a) => <AlertCard key={a.id} a={a} t={t} />)}</div>
                      {alerts.length > 2 && <button className="dl-btn ghost block" onClick={() => setView("alerts")}>{t.active_alerts} ({alerts.length}) <ChevronRight size={15} /></button>}
                    </div>
                  )}
                </div>
              )}

              {view === "alerts" && (
                <div className="dl-stack">
                  <div className="dl-card">
                    <div className="dl-card-head"><BellRing size={16} /> <h3>{t.active_alerts}</h3>{alerts.length > 0 && <span className="dl-count">{alerts.length}</span>}</div>
                    {alerts.length === 0
                      ? <div className="dl-empty"><div className="dl-empty-ic"><Check size={26} /></div><h4>{t.no_alerts}</h4><p>{t.no_alerts_sub}</p></div>
                      : <div className="dl-alerts">{alerts.map((a) => <AlertCard key={a.id} a={a} t={t} />)}</div>}
                  </div>
                </div>
              )}

              {view === "history" && (
                <div className="dl-stack">
                  <div className="dl-view-head"><h2>{t.history}</h2><p>{t.history_sub}</p></div>
                  <div className="dl-card">
                    {(me.alertHistory || []).length === 0 ? (
                      <div className="dl-empty">
                        <div className="dl-empty-ic" style={{ background: "var(--surface-2)", color: "var(--azure)" }}><Inbox size={26} /></div>
                        <h4>{t.no_history}</h4><p>{t.no_history_sub}</p>
                      </div>
                    ) : (
                      <>
                        <div className="dl-hist">
                          {me.alertHistory.map((e) => (
                            <div className="dl-histrow" key={e.key} style={{ "--sev": e.sevColor }}>
                              <span className="dl-hist-bar" />
                              <div className="dl-hist-main">
                                <div className="dl-hist-top">
                                  <span className="dl-hist-title">{e.title}</span>
                                  <span className="dl-hist-sev">{lang === "sw" ? e.sevSw : e.sevEn}</span>
                                </div>
                                {e.impact && <p className="dl-hist-impact">{e.impact}</p>}
                                <div className="dl-hist-meta"><MapPin size={12} /> {e.loc} · {new Date(e.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button className="dl-btn ghost sm" style={{ marginTop: 12 }} onClick={() => updateMe({ alertHistory: [] })}>
                          <Trash2 size={14} /> {t.clear_history}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {view === "trends" && (
                <>
                  <div className="dl-view-head"><h2>{t.trends_t}</h2><p>{t.trends_sub}</p></div>
                  <TrendsView data={data} units={units} t={t} lang={lang} />
                </>
              )}

              {view === "map" && (
                <MapView saved={savedLocs} current={location} conditions={conditions} units={units} t={t} lang={lang} onSelect={selectLocation} onFocus={focusLocation} />
              )}

              {view === "advice" && (
                <div className="dl-stack">
                  <div className="dl-view-head">
                    <h2>{t.advice_for} {lang === "sw" ? ROLES.find((r) => r.id === activeRole)?.sw : ROLES.find((r) => r.id === activeRole)?.en}</h2>
                    <p>{t.preview_role}:</p>
                    <div className="dl-rolepills">
                      {ROLES.map((r) => { const Ic = r.Icon; return (
                        <button key={r.id} className={`dl-pill ${activeRole === r.id ? "on" : ""}`} onClick={() => setPreviewRole(r.id === me.role ? null : r.id)}>
                          <Ic size={14} /> {lang === "sw" ? r.sw : r.en}
                        </button>
                      ); })}
                    </div>
                  </div>
                  <div className="dl-advgrid">{advisories.map((c, i) => <AdvisoryCard key={i} c={c} />)}</div>
                </div>
              )}

              {view === "notify" && <NotificationsView me={me} updateMe={updateMe} t={t} lang={lang} />}

              {view === "settings" && (
                <SettingsView me={me} updateMe={updateMe} lang={lang} setLang={setLang} t={t} onLogout={onLogout} account={account} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="dl-bottom">
        {NAV.filter((n) => ["dashboard", "alerts", "map", "advice", "notify"].includes(n.id)).map((n) => { const Ic = n.Icon; return (
          <button key={n.id} className={view === n.id ? "on" : ""} onClick={() => setView(n.id)}>
            <span className="dl-bottom-ic"><Ic size={20} />{n.id === "alerts" && alerts.length > 0 && <em />}</span>
            <span className="dl-bottom-l">{lang === "sw" ? n.sw : n.en}</span>
          </button>
        ); })}
      </nav>
    </div>
  );
}

/* =============================== Stylesheet ================================ */

function StyleTag() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root{
  --sky:#38BDF8; --sky-2:#7DD3FC; --azure:#0284C7; --azure-deep:#0369A1;
  --sun:#FDB813; --sun-soft:#FFD66B; --sun-ink:#E59A00;
  --amber:#F59E0B; --ember:#EF4444;
  --ink:#0B2540; --ink-soft:#5E748C; --ink-faint:#94A6BA;
  --bg:#EAF5FE; --bg-2:#DDEEFB;
  --surface:#FFFFFF; --surface-2:#F4F9FE;
  --line:#DCEAF6; --line-2:#E8F1FA;
  --shadow:0 1px 2px rgba(11,37,64,.05), 0 8px 24px rgba(2,132,199,.08);
  --shadow-lg:0 12px 40px rgba(2,132,199,.16);
  --r:18px; --r-lg:24px; --r-sm:12px;
  --display:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --ui:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,monospace;
}

/* ---------- Dark mode (applied via <html data-theme="dark">) ---------- */
:root[data-theme="dark"]{
  --ink:#e9f1fb; --ink-soft:#a6bacd; --ink-faint:#6d8296;
  --bg:#0a1420; --bg-2:#0d1a29;
  --surface:#132234; --surface-2:#182a3f;
  --line:#243748; --line-2:#1d2c3e;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.34);
  --shadow-lg:0 12px 40px rgba(0,0,0,.5);
}
:root[data-theme="dark"] .dl-top{background:rgba(10,20,32,.82)}
:root[data-theme="dark"] .dl-side{background:rgba(14,26,41,.78)}
:root[data-theme="dark"] .dl-bottom{background:rgba(14,26,41,.92)}
:root[data-theme="dark"] .dl-field:focus-within{background:var(--surface)}
:root[data-theme="dark"] .dl-seg button.on{background:var(--surface)}
:root[data-theme="dark"] .dl-auth-lang,:root[data-theme="dark"] .dl-seg-mini{background:var(--surface-2)}
:root[data-theme="dark"] .dl-lpin-label{background:rgba(20,32,48,.92);color:var(--ink)}

*{box-sizing:border-box}
.dl-root,.dl-auth,.dl-onboard{font-family:var(--ui);color:var(--ink);-webkit-font-smoothing:antialiased}
.dl-root *,.dl-auth *,.dl-onboard *{margin:0}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
input{font-family:inherit}
h1,h2,h3,h4{font-family:var(--display);letter-spacing:-.01em;line-height:1.12}

/* ---------- Loading / intro splash ---------- */
.dl-intro{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  background:radial-gradient(1000px 520px at 50% 20%,rgba(56,189,248,.18),transparent 60%),linear-gradient(170deg,#0b2540 0%,#0a1420 100%)}
.dl-intro-anim{display:grid;place-items:center}
.dl-intro-brand{font-family:var(--display);font-weight:800;font-size:34px;letter-spacing:-.02em;
  background:linear-gradient(120deg,#7DD3FC,#FDB813);-webkit-background-clip:text;background-clip:text;color:transparent}
.dl-intro-tag{color:#9db3c4;font-size:14px;font-weight:600}

/* ---------- App shell ---------- */
.dl-root{display:grid;grid-template-columns:264px 1fr;min-height:100dvh;background:
  radial-gradient(1200px 500px at 80% -10%, rgba(56,189,248,.16), transparent 60%),
  linear-gradient(180deg,var(--bg) 0%, var(--bg-2) 100%);}
.dl-side{position:sticky;top:0;height:100dvh;display:flex;flex-direction:column;gap:6px;
  padding:20px 14px;background:rgba(255,255,255,.72);backdrop-filter:blur(14px);
  border-right:1px solid var(--line);z-index:40}
.dl-side nav{display:flex;flex-direction:column;gap:3px;margin-top:14px;flex:1}
.dl-navbtn{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:13px;
  color:var(--ink-soft);font-weight:600;font-size:14.5px;position:relative;transition:.16s}
.dl-navbtn:hover{background:var(--surface-2);color:var(--ink)}
.dl-navbtn.on{background:linear-gradient(120deg,var(--azure),var(--sky));color:#fff;box-shadow:0 6px 16px rgba(2,132,199,.3)}
.dl-badge{margin-left:auto;background:var(--ember);color:#fff;font-size:11px;font-weight:700;
  min-width:19px;height:19px;border-radius:10px;display:grid;place-items:center;padding:0 5px}
.dl-navbtn.on .dl-badge{background:rgba(255,255,255,.28)}
.dl-side-foot{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line)}
.dl-side-acc{flex:1;min-width:0;display:flex;flex-direction:column}
.dl-side-acc span{font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dl-side-acc small{color:var(--ink-soft);font-size:11.5px}

.dl-brand{display:flex;align-items:center;gap:11px}
.dl-logo{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(135deg,var(--azure) 0%,var(--sky) 60%,var(--sun-soft) 130%);
  box-shadow:0 6px 18px rgba(2,132,199,.34)}
.dl-brand.compact .dl-logo{width:36px;height:36px}
.dl-brand-text{display:flex;flex-direction:column}
.dl-brand-name{font-family:var(--display);font-weight:800;font-size:21px;letter-spacing:-.02em;background:linear-gradient(120deg,var(--azure),var(--sky));-webkit-background-clip:text;background-clip:text;color:transparent}
.dl-brand-tag{font-size:11px;color:var(--ink-soft);font-weight:500}

.dl-scrim{position:fixed;inset:0;background:rgba(11,37,64,.4);z-index:35;backdrop-filter:blur(2px)}

.dl-main{display:flex;flex-direction:column;min-width:0}
.dl-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:10px;
  padding:12px clamp(14px,3vw,30px);background:rgba(234,245,254,.82);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.dl-burger{display:none;width:40px;height:40px;border-radius:11px;background:var(--surface);border:1px solid var(--line);align-items:center;justify-content:center;color:var(--ink)}
.dl-locbtn{display:flex;align-items:baseline;gap:8px;padding:9px 14px;border-radius:13px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow);color:var(--ink)}
.dl-locbtn span{font-weight:700;font-size:15px}
.dl-locbtn small{color:var(--ink-soft);font-size:12px}
.dl-top-actions{margin-left:auto;display:flex;align-items:center;gap:8px}
.dl-icbtn{width:40px;height:40px;border-radius:11px;background:var(--surface);border:1px solid var(--line);display:grid;place-items:center;color:var(--ink-soft);transition:.16s}
.dl-icbtn:hover{color:var(--azure);border-color:var(--sky)}
.dl-icbtn.danger:hover{color:var(--ember);border-color:#fab}
.dl-seg-mini{display:flex;border:1px solid var(--line);border-radius:11px;overflow:hidden;background:var(--surface);font-size:12.5px;font-weight:700}
.dl-seg-mini span{padding:9px 11px;color:var(--ink-faint)}
.dl-seg-mini span.on{background:var(--azure);color:#fff}

.dl-content{padding:clamp(12px,1.8vw,22px);max-width:1280px;width:100%;margin:0 auto}
.dl-stack{display:flex;flex-direction:column;gap:clamp(12px,2vw,18px)}
.dl-view-head{margin-bottom:4px}
.dl-view-head h2{font-size:clamp(20px,3vw,26px)}
.dl-view-head p{color:var(--ink-soft);font-size:13.5px;margin-top:3px}

/* ---------- Hero / Living sky (roughly one screen tall) ---------- */
.dl-hero{position:relative;border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-lg);min-height:clamp(460px,84vh,860px)}
.dl-sky{position:relative;width:100%;height:100%;min-height:inherit}
.dl-skyfx{position:absolute;inset:0;overflow:hidden}
.dl-sky-inner{position:relative;z-index:3;height:100%;min-height:inherit;display:flex;flex-direction:column;justify-content:space-between;gap:20px;padding:clamp(20px,3.5vw,40px)}
/* Location on the card */
.dl-sky-loc{display:flex;align-items:center;gap:10px}
.dl-sky-loc>svg{opacity:.92}
.dl-sky-loc-text{display:flex;flex-direction:column;line-height:1.15}
.dl-sky-loc-name{font-family:var(--display);font-weight:800;font-size:clamp(20px,3.4vw,30px);letter-spacing:-.01em}
.dl-sky-loc-region{font-size:13px;font-weight:600;opacity:.82}
.dl-sky-now{display:flex;align-items:flex-start;gap:16px}
.dl-sky-temp{font-family:var(--display);font-weight:700;font-size:clamp(72px,15vw,140px);line-height:.9;letter-spacing:-.04em}
.dl-sky-meta{padding-top:12px}
.dl-sky-cond{display:flex;align-items:center;gap:8px;font-weight:700;font-size:clamp(16px,2.6vw,22px)}
.dl-sky-feels{font-size:14.5px;opacity:.85;margin-top:4px;font-weight:500}
/* Sunrise / sunset — labelled + colour-coded */
.dl-sky-rise{display:flex;flex-wrap:wrap;gap:12px}
.dl-rise{display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:16px;
  background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.32);backdrop-filter:blur(6px);min-width:150px}
.dl-rise-text{display:flex;flex-direction:column;line-height:1.1}
.dl-rise-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.95}
.dl-rise b{font-family:var(--mono);font-size:20px;font-weight:600;margin-top:2px}
.dl-rise.sunrise{background:linear-gradient(120deg,rgba(253,184,19,.34),rgba(255,214,107,.14));border-color:rgba(253,184,19,.55)}
.dl-rise.sunrise>svg{color:#FFC24B}
.dl-rise.sunrise .dl-rise-label{color:#7a5200}
.dl-rise.sunset{background:linear-gradient(120deg,rgba(244,114,94,.34),rgba(150,86,196,.18));border-color:rgba(244,114,94,.55)}
.dl-rise.sunset>svg{color:#FF7E4B}
.dl-rise.sunset .dl-rise-label{color:#7a2f12}

.dl-sun{position:absolute;top:8%;right:9%;width:96px;height:96px}
.dl-sun-core{position:absolute;inset:24px;border-radius:50%;background:radial-gradient(circle,#FFF1C2,var(--sun) 70%);box-shadow:0 0 40px rgba(253,184,19,.7)}
.dl-sun-glow{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(253,184,19,.5),transparent 68%);animation:pulse 5s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.12);opacity:1}}
.dl-moon{position:absolute;top:11%;right:12%;width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fdfdff,#cdd7e8);box-shadow:0 0 30px rgba(205,215,232,.5),inset -10px -8px 0 rgba(120,135,165,.28)}
.dl-stars span{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;opacity:.85;animation:twinkle 3.5s ease-in-out infinite}
@keyframes twinkle{0%,100%{opacity:.25}50%{opacity:.95}}
.dl-clouds{position:absolute;inset:0}
.dl-cloud{position:absolute;background:rgba(255,255,255,.9);border-radius:100px;filter:blur(.4px);box-shadow:0 8px 24px rgba(11,37,64,.08)}
.dl-cloud::before,.dl-cloud::after{content:"";position:absolute;background:inherit;border-radius:50%}
/* Clouds drift horizontally (translate) AND bob vertically (transform) for a
   floatier feel; the two properties stack without conflicting. */
.dl-cloud.c1{width:120px;height:34px;top:20%;translate:-130px 0;animation:cloudmove 34s linear infinite, cloudbob 7s ease-in-out infinite}
.dl-cloud.c1::before{width:54px;height:54px;top:-22px;left:20px}.dl-cloud.c1::after{width:42px;height:42px;top:-15px;left:62px}
.dl-cloud.c2{width:90px;height:26px;top:44%;translate:-100px 0;opacity:.78;animation:cloudmove 48s linear infinite 6s, cloudbob 9s ease-in-out infinite 1s}
.dl-cloud.c2::before{width:40px;height:40px;top:-16px;left:16px}.dl-cloud.c2::after{width:32px;height:32px;top:-11px;left:46px}
.dl-cloud.c3{width:70px;height:20px;top:12%;translate:-80px 0;opacity:.62;animation:cloudmove 42s linear infinite 14s, cloudbob 8s ease-in-out infinite 2s}
.dl-cloud.c3::before{width:30px;height:30px;top:-12px;left:12px}.dl-cloud.c3::after{width:26px;height:26px;top:-9px;left:34px}
.dl-cloud.c4{width:150px;height:42px;top:62%;translate:-160px 0;opacity:.72;animation:cloudmove 58s linear infinite 3s, cloudbob 11s ease-in-out infinite}
.dl-cloud.c4::before{width:66px;height:66px;top:-28px;left:26px}.dl-cloud.c4::after{width:50px;height:50px;top:-18px;left:78px}
.dl-cloud.c5{width:100px;height:28px;top:80%;translate:-120px 0;opacity:.55;animation:cloudmove 50s linear infinite 20s, cloudbob 10s ease-in-out infinite 3s}
.dl-cloud.c5::before{width:44px;height:44px;top:-18px;left:18px}.dl-cloud.c5::after{width:34px;height:34px;top:-12px;left:52px}
@keyframes cloudmove{from{translate:-180px 0}to{translate:calc(100vw + 260px) 0}}
@keyframes cloudbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
.dl-rain{position:absolute;inset:0}
.dl-rain span{position:absolute;top:-14%;width:2px;height:16px;background:linear-gradient(transparent,rgba(255,255,255,.75));border-radius:2px;animation:fall linear infinite}
@keyframes fall{from{transform:translateY(-20px)}to{transform:translateY(115%)}}
.dl-flash{position:absolute;inset:0;background:rgba(255,255,255,.85);opacity:0;animation:flash 7s linear infinite}
@keyframes flash{0%,93%,100%{opacity:0}94%{opacity:.7}95%{opacity:.1}96%{opacity:.5}97%{opacity:0}}

/* Birds gliding across the day sky (silhouettes with flapping wings).
   Per-bird top/width/duration/delay/dip come from inline random styles. */
.dl-birds{position:absolute;inset:0}
.dl-bird{position:absolute;height:auto;opacity:.5;animation-name:birdfly;animation-timing-function:linear;animation-iteration-count:infinite}
.dl-bird svg{width:100%;height:100%;overflow:visible;transform-origin:50% 50%;animation-name:flap;animation-timing-function:ease-in-out;animation-iteration-count:infinite}
.dl-bird svg path{fill:none;stroke:rgba(11,37,64,.5);stroke-width:1.6;stroke-linecap:round}
@keyframes birdfly{0%{transform:translate(-12vw,0)}50%{transform:translate(52vw,var(--dip,-20px))}100%{transform:translate(116vw,8px)}}
@keyframes flap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.5)}}

/* Real constellations (night) */
.dl-constels{position:absolute;inset:0;opacity:.9}
.dl-constel{position:absolute;overflow:visible}
.dl-constel line{stroke:rgba(255,255,255,.3);stroke-width:.45}
.dl-constel circle{fill:#fff;filter:drop-shadow(0 0 3px rgba(255,255,255,.9));animation:twinkle 4.5s ease-in-out infinite}

/* Shooting stars (night) — random start; bright head leads down-right, tail behind.
   Per-star angle/distance/duration/delay come from inline random styles. */
.dl-shooters{position:absolute;inset:0;overflow:hidden}
.dl-sh{position:absolute;height:2px;width:150px;border-radius:2px;opacity:0;transform-origin:left center;
  background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.95) 100%);
  filter:drop-shadow(0 0 6px rgba(255,255,255,.7));
  animation-name:shoot;animation-timing-function:ease-in;animation-iteration-count:infinite}
@keyframes shoot{
  0%{opacity:0;transform:rotate(var(--ang,25deg)) translateX(0) scaleX(.3)}
  4%{opacity:1;transform:rotate(var(--ang,25deg)) translateX(0) scaleX(1)}
  18%{opacity:0;transform:rotate(var(--ang,25deg)) translateX(var(--dist,460px)) scaleX(1)}
  100%{opacity:0;transform:rotate(var(--ang,25deg)) translateX(var(--dist,460px)) scaleX(1)}
}

@media (prefers-reduced-motion: reduce){.dl-cloud,.dl-rain span,.dl-flash,.dl-sun-glow,.dl-stars span,.dl-bird,.dl-bird svg,.dl-sh,.dl-constel circle{animation:none!important}.dl-sh{opacity:0}}

/* ---------- Cards ---------- */
.dl-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:clamp(14px,2.4vw,20px);box-shadow:var(--shadow)}
.dl-card-head{display:flex;align-items:center;gap:9px;margin-bottom:14px;color:var(--azure)}
.dl-card-head h3{font-size:15px;color:var(--ink);flex:1}
.dl-count{background:var(--surface-2);color:var(--azure);font-weight:700;font-size:12px;padding:3px 9px;border-radius:9px}

/* metrics */
.dl-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:clamp(8px,1.5vw,12px)}
.dl-metric{display:flex;align-items:center;gap:13px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:15px 16px;box-shadow:var(--shadow)}
.dl-metric-ic{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(56,189,248,.16),rgba(2,132,199,.12));color:var(--azure);flex-shrink:0}
.dl-metric-label{font-size:11.5px;color:var(--ink-soft);font-weight:600;text-transform:uppercase;letter-spacing:.03em}
.dl-metric-val{font-family:var(--mono);font-size:22px;font-weight:600;margin-top:2px}
.dl-metric-sub{font-family:var(--ui);font-size:11.5px;color:var(--ink-faint);font-weight:600}

/* sign */
.dl-sign{display:flex;align-items:center;gap:10px;padding:13px 16px;border-radius:var(--r);font-weight:600;font-size:14px;border:1px solid var(--line);background:var(--surface);box-shadow:var(--shadow)}
.dl-sign.tone-good{border-color:#bfe9c8;background:linear-gradient(100deg,#f0fbf2,#fff)}
.dl-sign.tone-caution{border-color:#fde6b0;background:linear-gradient(100deg,#fff8e9,#fff)}
.dl-sign.tone-alert{border-color:#f8c2c2;background:linear-gradient(100deg,#fdeeee,#fff)}
.dl-sign.tone-good>svg{color:#179a4e}.dl-sign.tone-caution>svg{color:var(--sun-ink)}.dl-sign.tone-alert>svg{color:var(--ember)}
.dl-sign-go{margin-left:auto;display:flex;align-items:center;gap:3px;color:var(--azure);font-weight:700;font-size:13px;white-space:nowrap}

/* hourly */
.dl-hours{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin}
.dl-hour{flex:0 0 auto;width:74px;display:flex;flex-direction:column;align-items:center;gap:9px;padding:14px 6px;border-radius:14px;background:var(--surface-2)}
.dl-hour-t{font-size:11.5px;color:var(--ink-soft);font-weight:600}
.dl-hour-ic{color:var(--azure)}
.dl-hour-temp{font-family:var(--mono);font-weight:600;font-size:15px}
.dl-hour-p{font-size:11px;color:var(--sky);font-weight:700}
.dl-hour-p.hot{color:var(--azure-deep)}

/* daily */
.dl-days{display:flex;flex-direction:column}
.dl-day{display:grid;grid-template-columns:46px 24px 40px 38px 1fr 38px;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line-2)}
.dl-day:last-child{border-bottom:none}
.dl-day-name{font-weight:600;font-size:13.5px}
.dl-day-ic{color:var(--azure)}
.dl-day-p{font-size:11.5px;color:var(--sky);font-weight:700;text-align:right}
.dl-day-lo{font-family:var(--mono);color:var(--ink-faint);text-align:right;font-size:13.5px}
.dl-day-hi{font-family:var(--mono);font-weight:600;text-align:right;font-size:13.5px}
.dl-day-bar{position:relative;height:6px;background:var(--line);border-radius:4px}
.dl-day-bar span{position:absolute;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--sky),var(--sun))}

/* alerts */
.dl-alerts{display:flex;flex-direction:column;gap:11px}
.dl-alert{position:relative;display:flex;gap:13px;padding:14px 15px 14px 18px;border-radius:var(--r);background:var(--surface-2);border:1px solid var(--line);overflow:hidden}
.dl-alert-bar{position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--sev)}
.dl-alert-ic{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--sev) 16%,#fff);color:var(--sev);flex-shrink:0}
.dl-alert-head{display:flex;align-items:center;gap:10px}
.dl-alert-title{font-weight:700;font-size:15px}
.dl-alert-sev{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#fff;background:var(--sev);padding:3px 8px;border-radius:7px}
.dl-alert-window{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--ink-soft);margin:5px 0 7px;font-weight:600}
.dl-alert-impact{font-size:13.5px;color:var(--ink);line-height:1.45}
.dl-alert-action{font-size:13px;color:var(--ink-soft);margin-top:5px;line-height:1.45}
.dl-alert-action strong{color:var(--ink)}

/* alert history */
.dl-hist{display:flex;flex-direction:column;gap:9px}
.dl-histrow{position:relative;display:flex;gap:12px;padding:12px 14px 12px 16px;border-radius:var(--r-sm);background:var(--surface-2);border:1px solid var(--line);overflow:hidden}
.dl-hist-bar{position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--sev)}
.dl-hist-main{flex:1;min-width:0}
.dl-hist-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dl-hist-title{font-weight:700;font-size:14px}
.dl-hist-sev{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#fff;background:var(--sev);padding:2px 7px;border-radius:6px}
.dl-hist-impact{font-size:13px;color:var(--ink-soft);line-height:1.45;margin:4px 0 6px}
.dl-hist-meta{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--ink-faint);font-weight:600}

/* advisories */
.dl-advgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.dl-adv{display:flex;gap:12px;padding:15px;border-radius:var(--r);background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow)}
.dl-adv-ic{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex-shrink:0}
.dl-adv-title{font-weight:700;font-size:14.5px;margin-bottom:4px}
.dl-adv-body{font-size:13px;color:var(--ink-soft);line-height:1.5}
.dl-adv.tone-good .dl-adv-ic{background:#e6f7ec;color:#179a4e}
.dl-adv.tone-caution .dl-adv-ic{background:#fff3da;color:var(--sun-ink)}
.dl-adv.tone-alert .dl-adv-ic{background:#fde8e8;color:var(--ember)}
.dl-adv.tone-neutral .dl-adv-ic{background:rgba(56,189,248,.16);color:var(--azure)}
.dl-rolepills,.dl-rolepills{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
.dl-pill{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:20px;border:1px solid var(--line);background:var(--surface);font-size:12.5px;font-weight:600;color:var(--ink-soft)}
.dl-pill.on{background:var(--azure);color:#fff;border-color:var(--azure)}

/* charts/trends */
.dl-chart{margin:0 -4px}
.dl-season p{color:var(--ink-soft);font-size:13.5px;line-height:1.5}

/* map */
.dl-map-card{padding-bottom:14px}
.dl-gmap,.dl-svgmap-wrap{width:100%;border-radius:var(--r-sm);overflow:hidden}
.dl-gmap{height:clamp(420px,64vh,720px);border:1px solid var(--line);z-index:0}
.dl-map-loading{height:clamp(420px,64vh,720px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--ink-soft);background:var(--surface-2);border-radius:var(--r-sm)}
/* Leaflet marker pins (sky-coded) */
.dl-lpin-wrap{background:none!important;border:none!important;width:auto!important;height:auto!important}
.leaflet-div-icon.dl-lpin-wrap{background:none;border:none}
.dl-lpin-dot{display:inline-block;width:14px;height:14px;border-radius:50%;background:var(--sky);border:2px solid #fff;box-shadow:0 1px 5px rgba(11,37,64,.45);vertical-align:middle}
.dl-lpin-dot.cur{background:var(--azure);width:18px;height:18px;box-shadow:0 0 0 4px rgba(2,132,199,.25),0 1px 5px rgba(11,37,64,.45)}
.dl-lpin-label{display:inline-block;margin-left:6px;font:600 11.5px var(--ui);color:var(--ink);background:rgba(255,255,255,.92);padding:1px 7px;border-radius:7px;box-shadow:0 1px 3px rgba(11,37,64,.25);white-space:nowrap;vertical-align:middle}
/* Manual location search on the map (kept above the map layers) */
.dl-mapsearch{position:relative;margin-bottom:12px;z-index:1000}
.dl-mapsearch-spin{position:absolute;right:14px;top:14px;color:var(--azure)}
.dl-mapsearch-res{position:absolute;left:0;right:0;top:calc(100% + 6px);background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);box-shadow:var(--shadow-lg);padding:6px;max-height:320px;overflow-y:auto;z-index:1001}
.dl-map-note{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-soft);background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:9px 12px;margin-bottom:12px}
.dl-svgmap{width:100%;height:auto;background:linear-gradient(180deg,#f3faff,#e8f4fe);border-radius:var(--r-sm);border:1px solid var(--line)}
.dl-pin-temp{font-family:var(--mono);font-size:11px;font-weight:600;fill:var(--ink)}
.dl-pin-name{font-size:10.5px;font-weight:600;fill:var(--ink-soft)}
.dl-pin circle{transition:.16s}.dl-pin:hover circle{r:9}
.dl-loclist{display:flex;flex-direction:column;gap:4px}
.dl-locrow{display:flex;align-items:center;gap:12px;padding:12px;border-radius:13px;border:1px solid transparent;color:var(--ink);text-align:left;transition:.14s}
.dl-locrow:hover{background:var(--surface-2)}
.dl-locrow.active{background:linear-gradient(100deg,rgba(56,189,248,.12),var(--surface-2));border-color:var(--sky)}
.dl-locrow>svg{color:var(--azure)}
.dl-locrow-main{flex:1;display:flex;flex-direction:column}
.dl-locrow-main span{font-weight:600;font-size:14px}
.dl-locrow-main small{color:var(--ink-soft);font-size:12px}
.dl-locrow-temp{font-family:var(--mono);font-weight:600;font-size:15px}
.dl-locrow-go{color:var(--ink-faint)}

/* notifications / sms */
.dl-row-between{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dl-muted{color:var(--ink-soft);font-size:13px;line-height:1.5;margin-bottom:12px}
.dl-muted.sm{font-size:12px;margin:0}
.dl-addrow{display:flex;gap:8px;align-items:stretch}
.dl-addrow .dl-field{flex:1}
.dl-field{display:flex;align-items:center;gap:9px;background:var(--surface-2);border:1.5px solid var(--line);border-radius:12px;padding:0 13px;transition:.16s}
.dl-field:focus-within{border-color:var(--sky);background:#fff;box-shadow:0 0 0 4px rgba(56,189,248,.13)}
.dl-field-ic{color:var(--ink-faint);flex-shrink:0}
.dl-field input{flex:1;border:none;outline:none;background:none;padding:12px 0;font-size:14.5px;color:var(--ink);min-width:0}
.dl-inline-err{display:flex;align-items:center;gap:6px;color:var(--ember);font-size:12.5px;font-weight:600;margin-top:9px}
.dl-phones{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.dl-phone{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:13px;background:var(--surface-2);border:1px solid var(--line)}
.dl-phone-ic{color:var(--azure);flex-shrink:0}
.dl-phone-main{flex:1;min-width:0}
.dl-phone-num{font-family:var(--mono);font-weight:600;font-size:14.5px;display:block}
.dl-phone-tags{display:flex;gap:6px;margin-top:3px;flex-wrap:wrap}
.tag{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;font-style:normal}
.tag.primary{background:rgba(2,132,199,.13);color:var(--azure)}
.tag.ok{background:#e6f7ec;color:#179a4e}
.tag.warn{background:#fff3da;color:var(--sun-ink)}
.dl-phone-actions{display:flex;gap:5px}
.dl-icbtn.danger{color:var(--ink-faint)}
.dl-prefrows{display:flex;flex-direction:column;gap:4px}
.dl-prefrow{display:flex;align-items:center;gap:10px;padding:10px 2px}
.dl-prefrow span:nth-child(2){flex:1;font-weight:600;font-size:14px}
.dl-dot{width:11px;height:11px;border-radius:50%}
.dl-divider{height:1px;background:var(--line);margin:14px 0}
.dl-outbox{display:flex;flex-direction:column;gap:3px}
.dl-outrow{display:flex;align-items:center;gap:10px;padding:10px 2px;border-bottom:1px solid var(--line-2)}
.dl-outrow:last-child{border-bottom:none}
.dl-outdot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dl-outdot.sim{background:var(--amber)}.dl-outdot.live{background:#179a4e}.dl-outdot.fail{background:var(--ember)}
.dl-muted code{font-family:var(--mono);font-size:11.5px;background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:1px 6px;color:var(--azure)}
.dl-outmain{flex:1}
.dl-outto{font-family:var(--mono);font-weight:600;font-size:13.5px;display:block}
.dl-outmain small{color:var(--ink-soft);font-size:11.5px}
.dl-outrow time{font-size:11.5px;color:var(--ink-faint);font-family:var(--mono)}

/* settings */
.dl-account{display:flex;align-items:center;gap:12px;padding:12px;border-radius:13px;background:var(--surface-2);border:1px solid var(--line);margin-bottom:14px}
.dl-avatar{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-family:var(--display);font-weight:800;font-size:18px;color:#fff;background:linear-gradient(135deg,var(--azure),var(--sky));flex-shrink:0}
.dl-avatar.sm{width:34px;height:34px;font-size:14px}
.dl-account-name{font-weight:700;font-size:15px}
.dl-account>button{margin-left:auto}
.dl-role-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.dl-role-grid.big{grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:9px}
.dl-rolechip{display:flex;align-items:center;gap:8px;padding:12px 13px;border-radius:13px;border:1.5px solid var(--line);background:var(--surface);font-weight:600;font-size:13.5px;color:var(--ink-soft);transition:.14s}
.dl-rolechip:hover{border-color:var(--sky)}
.dl-rolechip.on{background:linear-gradient(120deg,var(--azure),var(--sky));color:#fff;border-color:transparent;box-shadow:0 6px 16px rgba(2,132,199,.28)}
.dl-seg{display:flex;background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:4px;gap:4px}
.dl-seg button{flex:1;padding:10px;border-radius:9px;font-weight:600;font-size:13.5px;color:var(--ink-soft)}
.dl-seg button.on{background:var(--surface);color:var(--azure);box-shadow:var(--shadow)}
.dl-th{display:flex;flex-direction:column;gap:15px}
.dl-throw-top{display:flex;justify-content:space-between;font-size:13.5px;font-weight:600;margin-bottom:7px}
.dl-throw-top b{font-family:var(--mono);color:var(--azure)}
.dl-throw input[type=range]{width:100%;-webkit-appearance:none;height:6px;border-radius:4px;background:var(--line);outline:none}
.dl-throw input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--azure);border:3px solid #fff;box-shadow:0 2px 6px rgba(2,132,199,.4);cursor:pointer}
.dl-throw input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--azure);border:3px solid #fff;cursor:pointer}
.dl-about p{font-size:13.5px;line-height:1.55;margin-bottom:6px}

/* toggles + buttons */
.dl-toggle{width:46px;height:27px;border-radius:20px;background:var(--line);position:relative;transition:.2s;flex-shrink:0}
.dl-toggle.on{background:linear-gradient(120deg,var(--azure),var(--sky))}
.dl-toggle span{position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:.2s}
.dl-toggle.on span{left:22px}
.dl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:13px;font-weight:700;font-size:14px;
  background:linear-gradient(120deg,var(--azure),var(--sky));color:#fff;box-shadow:0 6px 18px rgba(2,132,199,.3);transition:.16s}
.dl-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(2,132,199,.36)}
.dl-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.dl-btn.block{width:100%}
.dl-btn.sm{padding:9px 14px;font-size:13px}
.dl-btn.ghost{background:var(--surface);color:var(--azure);border:1.5px solid var(--sky);box-shadow:none}
.dl-btn.ghost:hover{background:var(--surface-2)}
.dl-btn.ghost.block{width:100%;margin-top:11px}

/* empty/loading/error */
.dl-empty{text-align:center;padding:34px 16px}
.dl-empty.sm{padding:18px;color:var(--ink-soft);font-size:13px}
.dl-empty-ic{width:60px;height:60px;border-radius:50%;background:#e6f7ec;color:#179a4e;display:grid;place-items:center;margin:0 auto 14px}
.dl-empty h4{font-size:17px;margin-bottom:5px}
.dl-empty p{color:var(--ink-soft);font-size:13.5px}
.dl-loading,.dl-error{text-align:center;padding:60px 20px;color:var(--ink-soft)}
.dl-loading p,.dl-error p{margin-top:14px;font-size:14.5px}
.dl-error>svg{color:var(--amber)}
.dl-error .dl-btn{margin-top:16px}
.dl-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}

/* ---------- Auth + Onboarding ---------- */
.dl-auth,.dl-onboard{min-height:100dvh;display:grid;place-items:center;padding:20px;position:relative;overflow:hidden;
  background:linear-gradient(170deg,#0EA5E9 0%,#38BDF8 42%,#7DD3FC 78%,#E0F2FE 100%)}
.dl-auth-sky,.dl-onboard-sky{position:absolute;inset:0;overflow:hidden}
.dl-auth-sky .dl-sun-core,.dl-onboard-sky .dl-sun-core{position:absolute;top:8%;left:10%;width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,#FFF1C2,var(--sun) 70%);box-shadow:0 0 60px rgba(253,184,19,.7)}
.dl-auth-sky .dl-sun-glow,.dl-onboard-sky .dl-sun-glow{position:absolute;top:4%;left:6%;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(253,184,19,.45),transparent 68%);animation:pulse 5s ease-in-out infinite}
.dl-auth-card,.dl-onboard-card{position:relative;z-index:2;width:100%;max-width:420px;background:rgba(255,255,255,.94);backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,.6);border-radius:var(--r-lg);padding:clamp(24px,4vw,34px);box-shadow:0 24px 70px rgba(2,90,150,.32)}
.dl-auth-h{font-size:clamp(22px,4vw,27px);margin-top:18px}
.dl-auth-sub{color:var(--ink-soft);font-size:13.5px;margin-top:6px}
.dl-auth-fields{display:flex;flex-direction:column;gap:10px;margin:20px 0 4px}
.dl-auth-card .dl-btn.block,.dl-onboard-card .dl-btn.block{margin-top:16px}
.dl-auth-switch{text-align:center;font-size:13.5px;color:var(--ink-soft);margin-top:16px}
.dl-auth-switch button{color:var(--azure);font-weight:700}
.dl-auth-demo{margin-top:14px;text-align:center;border-top:1px solid var(--line);padding-top:14px}
.dl-auth-demo button{display:inline-flex;align-items:center;gap:6px;color:var(--ink-soft);font-size:12.5px;font-weight:600;padding:8px 14px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line)}
.dl-auth-demo button:hover{color:var(--azure);border-color:var(--sky)}
.dl-auth-lang{position:absolute;top:16px;right:16px;display:flex;gap:4px;background:var(--surface-2);border-radius:10px;padding:3px}
.dl-auth-lang button{padding:6px 11px;border-radius:8px;font-size:12px;font-weight:700;color:var(--ink-faint)}
.dl-auth-lang button.on{background:var(--azure);color:#fff}
.dl-onboard-card h2{font-size:clamp(20px,4vw,25px);margin-top:16px}
.dl-onboard-card .dl-muted{margin-top:6px}
.dl-or{display:flex;align-items:center;gap:12px;margin:16px 0;color:var(--ink-faint);font-size:12px}
.dl-or::before,.dl-or::after{content:"";flex:1;height:1px;background:var(--line)}
.dl-onboard-card .dl-field{margin-top:4px}
.dl-search-res{display:flex;flex-direction:column;gap:2px;margin-top:8px;max-height:230px;overflow-y:auto}
.dl-search-row{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:11px;text-align:left;color:var(--ink);transition:.12s}
.dl-search-row:hover{background:var(--surface-2)}
.dl-search-row>svg{color:var(--azure)}
.dl-search-row span{font-weight:600;font-size:14px}
.dl-search-row small{color:var(--ink-soft);font-size:12px;margin-left:auto}
.dl-chosen{display:flex;align-items:center;gap:8px;margin-top:12px;padding:11px 14px;border-radius:12px;background:#e6f7ec;color:#0f7a3d;font-weight:600;font-size:13.5px}

/* ---------- Bottom nav (mobile) ---------- */
.dl-bottom{display:none}

/* ============ Responsive ============ */
@media (max-width:1024px){
  .dl-root{grid-template-columns:1fr}
  .dl-side{position:fixed;left:0;top:0;width:270px;transform:translateX(-100%);transition:transform .26s cubic-bezier(.4,0,.2,1)}
  .dl-side.open{transform:translateX(0);box-shadow:var(--shadow-lg)}
  .dl-burger{display:flex}
}
@media (max-width:860px){
  .dl-advgrid{grid-template-columns:1fr 1fr}
}
@media (max-width:640px){
  .dl-content{padding:14px 14px 96px}
  .dl-bottom{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;bottom:0;left:0;right:0;z-index:45;
    background:rgba(255,255,255,.93);backdrop-filter:blur(16px);border-top:1px solid var(--line);padding:7px 4px calc(7px + env(safe-area-inset-bottom,0))}
  .dl-bottom button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 2px;color:var(--ink-faint);font-size:0}
  .dl-bottom button.on{color:var(--azure)}
  .dl-bottom-ic{position:relative;display:grid;place-items:center}
  .dl-bottom-ic em{position:absolute;top:-3px;right:-5px;width:8px;height:8px;border-radius:50%;background:var(--ember);border:1.5px solid #fff}
  .dl-bottom-l{font-size:10.5px;font-weight:600}
  .dl-advgrid{grid-template-columns:1fr}
  .dl-locbtn small{display:none}
  .dl-sky-rise{gap:14px}
  .dl-day{grid-template-columns:42px 22px 34px 34px 1fr 34px;gap:7px}
}
@media (max-width:380px){
  .dl-metrics{grid-template-columns:1fr 1fr}
  .dl-role-grid,.dl-role-grid.big{grid-template-columns:1fr 1fr}
  .dl-sky-temp{font-size:clamp(48px,16vw,64px)}
}
`}</style>
  );
}
