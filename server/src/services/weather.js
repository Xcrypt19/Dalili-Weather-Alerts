import { env, hasKey } from '../config/env.js';
import { cache } from '../config/cache.js';

/**
 * Weather Data Aggregation Module (SRS §5.3, FR-13..18).
 * - Primary: Tomorrow.io
 * - Backup: OpenWeatherMap (auto-failover, FR-14/FR-17)
 * - Cached for WEATHER_CACHE_TTL_SECONDS to avoid repeat calls (FR-16)
 * - Mock generator keeps the app usable without API keys.
 *
 * Normalized shape (FR-15):
 * {
 *   source, place:{lat,lng}, updatedAt,
 *   current: { temperature, humidity, windSpeed, windDirection, rainfall,
 *              rainProbability, stormProbability, uvIndex, weatherCode },
 *   hourly: [ { time, temperature, rainProbability, windSpeed, weatherCode } ],  // 24h
 *   daily:  [ { date, tempMax, tempMin, rainProbability, rainfall, windSpeed, weatherCode } ] // 7d
 * }
 */

const TTL = env.weather.cacheTtl;

export async function getWeather(lat, lng, { force = false } = {}) {
  const key = `wx:${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (!force) {
    const cached = await cache.get(key);
    if (cached) return cached;
  }

  let data = null;
  if (hasKey(env.weather.tomorrowKey)) {
    try {
      data = await fromTomorrow(lat, lng);
    } catch (e) {
      console.warn('[weather] Tomorrow.io failed, trying backup:', e.message);
    }
  }
  if (!data && hasKey(env.weather.openWeatherKey)) {
    try {
      data = await fromOpenWeather(lat, lng);
    } catch (e) {
      console.warn('[weather] OpenWeatherMap failed:', e.message);
    }
  }
  if (!data) data = mockWeather(lat, lng);

  await cache.set(key, data, TTL);
  return data;
}

// ── Tomorrow.io ────────────────────────────────────────────────────────
async function fromTomorrow(lat, lng) {
  const fields = [
    'temperature',
    'humidity',
    'windSpeed',
    'windDirection',
    'rainAccumulation',
    'precipitationProbability',
    'uvIndex',
    'weatherCode',
    'temperatureMax',
    'temperatureMin',
  ].join(',');
  const url =
    `https://api.tomorrow.io/v4/timelines?location=${lat},${lng}` +
    `&fields=${fields}&timesteps=current,1h,1d&units=metric&apikey=${env.weather.tomorrowKey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Tomorrow.io ${r.status}`);
  const json = await r.json();
  const timelines = json.data?.timelines || [];
  const byStep = Object.fromEntries(timelines.map((t) => [t.timestep, t.intervals]));

  const cur = byStep.current?.[0]?.values || {};
  const stormProb = estimateStorm(cur.precipitationProbability, cur.windSpeed);

  return {
    source: 'tomorrow.io',
    place: { lat, lng },
    updatedAt: new Date().toISOString(),
    current: {
      temperature: cur.temperature,
      humidity: cur.humidity,
      windSpeed: cur.windSpeed,
      windDirection: cur.windDirection,
      rainfall: cur.rainAccumulation ?? 0,
      rainProbability: cur.precipitationProbability ?? 0,
      stormProbability: stormProb,
      uvIndex: cur.uvIndex ?? 0,
      weatherCode: cur.weatherCode,
    },
    hourly: (byStep['1h'] || []).slice(0, 24).map((i) => ({
      time: i.startTime,
      temperature: i.values.temperature,
      rainProbability: i.values.precipitationProbability ?? 0,
      windSpeed: i.values.windSpeed,
      weatherCode: i.values.weatherCode,
    })),
    daily: (byStep['1d'] || []).slice(0, 7).map((i) => ({
      date: i.startTime,
      tempMax: i.values.temperatureMax,
      tempMin: i.values.temperatureMin,
      rainProbability: i.values.precipitationProbability ?? 0,
      rainfall: i.values.rainAccumulation ?? 0,
      windSpeed: i.values.windSpeed,
      weatherCode: i.values.weatherCode,
    })),
  };
}

// ── OpenWeatherMap (One Call 3.0) ─────────────────────────────────────
async function fromOpenWeather(lat, lng) {
  const url =
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}` +
    `&units=metric&exclude=minutely,alerts&appid=${env.weather.openWeatherKey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`OpenWeatherMap ${r.status}`);
  const j = await r.json();
  const c = j.current || {};
  return {
    source: 'openweathermap',
    place: { lat, lng },
    updatedAt: new Date().toISOString(),
    current: {
      temperature: c.temp,
      humidity: c.humidity,
      windSpeed: c.wind_speed,
      windDirection: c.wind_deg,
      rainfall: c.rain?.['1h'] ?? 0,
      rainProbability: Math.round((j.hourly?.[0]?.pop ?? 0) * 100),
      stormProbability: estimateStorm((j.hourly?.[0]?.pop ?? 0) * 100, c.wind_speed),
      uvIndex: c.uvi ?? 0,
      weatherCode: c.weather?.[0]?.id,
    },
    hourly: (j.hourly || []).slice(0, 24).map((h) => ({
      time: new Date(h.dt * 1000).toISOString(),
      temperature: h.temp,
      rainProbability: Math.round((h.pop ?? 0) * 100),
      windSpeed: h.wind_speed,
      weatherCode: h.weather?.[0]?.id,
    })),
    daily: (j.daily || []).slice(0, 7).map((d) => ({
      date: new Date(d.dt * 1000).toISOString(),
      tempMax: d.temp?.max,
      tempMin: d.temp?.min,
      rainProbability: Math.round((d.pop ?? 0) * 100),
      rainfall: d.rain ?? 0,
      windSpeed: d.wind_speed,
      weatherCode: d.weather?.[0]?.id,
    })),
  };
}

// Rough storm likelihood from rain probability + wind.
function estimateStorm(rainProb = 0, windSpeed = 0) {
  const p = Math.min(100, Math.round(rainProb * 0.6 + windSpeed * 2));
  return Number.isFinite(p) ? p : 0;
}

// ── Mock data (no keys) ───────────────────────────────────────────────
function mockWeather(lat, lng) {
  const now = Date.now();
  const seed = Math.abs(Math.sin(lat * lng)) ;
  const baseTemp = 18 + seed * 10;
  const rainProb = Math.round(seed * 100);
  const hourly = Array.from({ length: 24 }, (_, i) => ({
    time: new Date(now + i * 3600_000).toISOString(),
    temperature: +(baseTemp + Math.sin(i / 3) * 4).toFixed(1),
    rainProbability: Math.max(0, Math.round(rainProb + Math.sin(i / 2) * 25)),
    windSpeed: +(8 + Math.cos(i / 4) * 6).toFixed(1),
    weatherCode: 1000,
  }));
  const daily = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(now + i * 86400_000).toISOString(),
    tempMax: +(baseTemp + 6 + Math.sin(i) * 2).toFixed(1),
    tempMin: +(baseTemp - 4 + Math.cos(i) * 2).toFixed(1),
    rainProbability: Math.max(0, Math.round(rainProb + Math.sin(i) * 30)),
    rainfall: +(seed * 12 * Math.abs(Math.sin(i))).toFixed(1),
    windSpeed: +(10 + Math.sin(i) * 5).toFixed(1),
    weatherCode: 1000,
  }));
  return {
    source: 'mock',
    place: { lat, lng },
    updatedAt: new Date(now).toISOString(),
    current: {
      temperature: +baseTemp.toFixed(1),
      humidity: Math.round(50 + seed * 40),
      windSpeed: +(8 + seed * 8).toFixed(1),
      windDirection: Math.round(seed * 360),
      rainfall: +(seed * 5).toFixed(1),
      rainProbability: rainProb,
      stormProbability: estimateStorm(rainProb, 8 + seed * 8),
      uvIndex: Math.round(seed * 11),
      weatherCode: 1000,
    },
    hourly,
    daily,
  };
}
