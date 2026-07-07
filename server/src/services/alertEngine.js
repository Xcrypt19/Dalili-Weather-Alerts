/**
 * Alert Processing Module (SRS §5.3, FR-19..23).
 * Pure logic: given normalized weather + a user's thresholds, decide which
 * alerts to raise, their type (FR-22) and severity (FR-20).
 */

// Map a threshold parameter to an alert type + advisory event (FR-22).
export const PARAMETER_MAP = {
  rain_probability: { type: 'rain', event: 'rain', label: 'Rain Alert', unit: '%' },
  rainfall: { type: 'flash_flood', event: 'flash_flood', label: 'Flash Flood Advisory', unit: 'mm' },
  wind_speed: { type: 'high_wind', event: 'high_wind', label: 'High Wind Alert', unit: 'km/h' },
  storm_probability: { type: 'storm', event: 'storm', label: 'Storm Warning', unit: '%' },
  temperature: { type: 'heat', event: 'heat', label: 'Heat Advisory', unit: '°C' },
  humidity: { type: 'fog', event: 'fog', label: 'Fog Warning', unit: '%' },
};

// Sensible defaults applied when a user has not set thresholds (FR-04 baseline).
export const DEFAULT_THRESHOLDS = [
  { parameter: 'rain_probability', comparator: 'gt', threshold_value: 70, unit: '%' },
  { parameter: 'wind_speed', comparator: 'gt', threshold_value: 50, unit: 'km/h' },
  { parameter: 'storm_probability', comparator: 'gt', threshold_value: 60, unit: '%' },
  { parameter: 'temperature', comparator: 'gt', threshold_value: 35, unit: '°C' },
  { parameter: 'rainfall', comparator: 'gt', threshold_value: 30, unit: 'mm' },
];

// Read the current value for a parameter from normalized weather.
function currentValue(weather, parameter) {
  const c = weather.current || {};
  switch (parameter) {
    case 'rain_probability':
      return c.rainProbability;
    case 'rainfall':
      return c.rainfall;
    case 'wind_speed':
      return c.windSpeed;
    case 'storm_probability':
      return c.stormProbability;
    case 'temperature':
      return c.temperature;
    case 'humidity':
      return c.humidity;
    default:
      return undefined;
  }
}

// Severity from how far the value exceeds the threshold (FR-20).
function classifySeverity(value, threshold, comparator) {
  const ratio = comparator === 'gt' ? value / threshold : threshold / value;
  if (ratio >= 1.6) return 'emergency';
  if (ratio >= 1.3) return 'warning';
  if (ratio >= 1.1) return 'watch';
  return 'advisory';
}

const SEVERITY_RANK = { advisory: 1, watch: 2, warning: 3, emergency: 4 };

/**
 * Evaluate thresholds against weather.
 * @returns array of candidate alerts (highest severity per type), unsorted.
 */
export function evaluate(weather, thresholds) {
  const active = (thresholds && thresholds.length ? thresholds : DEFAULT_THRESHOLDS).filter(
    (t) => t.active !== false,
  );
  const byType = new Map();

  for (const t of active) {
    const meta = PARAMETER_MAP[t.parameter];
    if (!meta) continue;
    const value = currentValue(weather, t.parameter);
    if (value === undefined || value === null) continue;

    const crossed =
      t.comparator === 'lt' ? value < t.threshold_value : value > t.threshold_value;
    if (!crossed) continue;

    const severity = classifySeverity(value, t.threshold_value, t.comparator || 'gt');
    const candidate = {
      alert_type: meta.type,
      event: meta.event,
      label: meta.label,
      severity,
      parameter: t.parameter,
      trigger_value: value,
      threshold_value: t.threshold_value,
      unit: t.unit || meta.unit,
    };
    const existing = byType.get(meta.type);
    if (!existing || SEVERITY_RANK[severity] > SEVERITY_RANK[existing.severity]) {
      byType.set(meta.type, candidate);
    }
  }
  return [...byType.values()];
}

/** Is the current hour within the user's quiet hours window? (FR-24) */
export function inQuietHours(user, date = new Date()) {
  const { quiet_start: s, quiet_end: e } = user;
  if (s == null || e == null) return false;
  const h = date.getHours();
  if (s === e) return false;
  if (s < e) return h >= s && h < e; // e.g. 22..23
  return h >= s || h < e; // overnight wrap e.g. 22..6
}

/** Build a human-readable alert message (FR-28). */
export function formatMessage(candidate, placeName) {
  const where = placeName ? ` in ${placeName}` : '';
  const v = Math.round(candidate.trigger_value);
  return `${candidate.label}${where}: ${candidate.parameter.replace(/_/g, ' ')} is ${v}${candidate.unit} (threshold ${candidate.threshold_value}${candidate.unit}).`;
}
