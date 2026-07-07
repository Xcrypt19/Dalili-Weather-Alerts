// Map weather codes (Tomorrow.io / OWM) to emoji + label, and helpers.
export function weatherEmoji(code, hour = 12) {
  const night = hour < 6 || hour > 19;
  if (code == null) return night ? '🌙' : '☀️';
  // Tomorrow.io codes
  if (code === 1000) return night ? '🌙' : '☀️';
  if (code === 1100 || code === 1101) return night ? '🌤️' : '⛅';
  if (code === 1102 || code === 1001) return '☁️';
  if (code >= 4000 && code < 5000) return '🌧️';
  if (code >= 5000 && code < 6000) return '❄️';
  if (code >= 8000) return '⛈️';
  if (code === 2000 || code === 2100) return '🌫️';
  // OpenWeatherMap (2xx thunder, 3xx drizzle, 5xx rain, 6xx snow, 7xx atmos, 800 clear, 80x clouds)
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 600) return '🌧️';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫️';
  if (code === 800) return night ? '🌙' : '☀️';
  if (code > 800) return '☁️';
  return night ? '🌙' : '☀️';
}

export function dayName(iso, lang = 'en') {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-KE', { weekday: 'short' });
}

export function hourLabel(iso) {
  return new Date(iso).toLocaleTimeString('en-KE', { hour: 'numeric' });
}

export const COUNTY_PRESETS = [
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219 },
  { name: 'Kiambu', lat: -1.1714, lng: 36.8356 },
  { name: 'Nakuru', lat: -0.3031, lng: 36.08 },
  { name: 'Kisumu', lat: -0.0917, lng: 34.768 },
];
