import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n.js';
import { useGeolocation } from '../hooks/useLive.js';
import { COUNTY_PRESETS } from '../utils/weather.js';

/**
 * Location picker (FR-08..12): use GPS, search a place (Google geocoding),
 * pick a Kenyan county preset, or choose a saved location.
 * Calls onPick({ lat, lng, name }).
 */
export default function LocationPicker({ locations = [], activeId, onPick, onSaved }) {
  const { t } = useI18n();
  const geo = useGeolocation();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [gpsPlace, setGpsPlace] = useState(null);
  const wantGps = useRef(false);

  // Resolve coords -> hyper-specific place (estate/road/ward) and bubble up (FR-09).
  async function pickFromCoords(coords) {
    const { place } = await api(
      `/locations/geocode/reverse?lat=${coords.lat}&lng=${coords.lng}`,
    ).catch(() => ({ place: null }));
    const name = place?.precise || place?.formatted || 'My location';
    setGpsPlace({ ...(place || {}), lat: coords.lat, lng: coords.lng, name });
    onPick({ lat: coords.lat, lng: coords.lng, name });
  }

  // Wait for the fix to settle so we geocode the refined GPS position,
  // not the first coarse wifi/cell estimate.
  useEffect(() => {
    if (wantGps.current && geo.status === 'granted' && geo.coords && geo.settled) {
      wantGps.current = false;
      pickFromCoords(geo.coords);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.coords, geo.settled]);

  function useGps() {
    if (geo.status === 'granted' && geo.coords && geo.settled) {
      pickFromCoords(geo.coords); // already have a settled fix
    } else {
      wantGps.current = true;
      geo.request();
    }
  }

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try {
      const { results } = await api(`/locations/geocode/forward?q=${encodeURIComponent(q)}`);
      setResults(results || []);
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrent(item) {
    const name = prompt('Name this location (e.g. My Farm):', item.name || item.precise || item.formatted || '');
    if (!name) return;
    const { location } = await api('/locations', {
      method: 'POST',
      body: {
        name,
        latitude: item.lat,
        longitude: item.lng,
        county: item.county,
        sub_county: item.subCounty,
        ward: item.ward,
        place_label: item.precise || item.formatted,
      },
    });
    onSaved?.(location);
    onPick({ lat: location.latitude, lng: location.longitude, name: location.name, id: location.id });
  }

  return (
    <div className="stack">
      <div className="row">
        <button className="btn accent sm" onClick={useGps} disabled={geo.status === 'pending'}>
          📍 {t('useMyLocation')}
        </button>
        {geo.status === 'pending' && <span className="muted" style={{ fontSize: '0.82rem' }}>{t('locating')}</span>}
        {geo.status === 'granted' && geo.accuracy != null && (
          <span className="muted" style={{ fontSize: '0.82rem' }}>±{Math.round(geo.accuracy)} m</span>
        )}
        {geo.status === 'denied' && <span className="muted" style={{ fontSize: '0.82rem' }}>GPS denied — search instead.</span>}
      </div>

      {gpsPlace && (
        <div className="row spread" style={{ background: 'var(--cloud-0)', padding: '8px 12px', borderRadius: 10 }}>
          <span style={{ fontSize: '0.88rem' }}>📍 {gpsPlace.name}</span>
          <button className="pill active" onClick={() => saveCurrent(gpsPlace)}>Save</button>
        </div>
      )}

      <form className="row" onSubmit={search} style={{ flexWrap: 'nowrap' }}>
        <input className="input" placeholder={t('searchPlace')} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn sm" disabled={busy}>🔍</button>
      </form>

      {results.length > 0 && (
        <div className="stack">
          {results.map((r, i) => (
            <div key={i} className="row spread" style={{ background: 'var(--cloud-0)', padding: '8px 12px', borderRadius: 10 }}>
              <span style={{ fontSize: '0.88rem' }}>{r.precise || r.formatted}</span>
              <div className="row">
                <button className="pill" onClick={() => onPick({ lat: r.lat, lng: r.lng, name: r.precise || r.formatted })}>View</button>
                <button className="pill active" onClick={() => saveCurrent(r)}>Save</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row">
        {COUNTY_PRESETS.map((c) => (
          <button key={c.name} className="pill" onClick={() => onPick({ lat: c.lat, lng: c.lng, name: c.name })}>{c.name}</button>
        ))}
      </div>

      {locations.length > 0 && (
        <div>
          <div className="card-title">{t('savedLocations')}</div>
          <div className="row">
            {locations.map((l) => (
              <button
                key={l.id}
                className={`pill ${activeId === l.id ? 'active' : ''}`}
                onClick={() => onPick({ lat: l.latitude, lng: l.longitude, name: l.name, id: l.id })}
              >
                {l.is_primary ? '⭐ ' : ''}{l.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
