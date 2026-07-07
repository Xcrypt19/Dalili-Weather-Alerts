import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n.js';
import { useLiveAlerts } from '../hooks/useLive.js';
import { weatherEmoji, dayName, hourLabel } from '../utils/weather.js';
import LocationPicker from '../components/LocationPicker.jsx';

export default function Dashboard() {
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);
  const [coords, setCoords] = useState(null);
  const [name, setName] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (locId, c) => {
    setLoading(true);
    try {
      let url = '/dashboard';
      if (locId) url += `?locationId=${locId}`;
      else if (c) url += `?lat=${c.lat}&lng=${c.lng}`;
      const d = await api(url);
      setData(d);
      if (d.activeLocation) {
        setCoords({ lat: d.activeLocation.latitude, lng: d.activeLocation.longitude });
        setName(d.activeLocation.name || d.activeLocation.place_label || d.activeLocation.county || '');
      }
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useLiveAlerts(useCallback((alert) => {
    setToast(`🔔 ${alert.message_text}`);
    setData((d) => (d ? { ...d, recentAlerts: [alert, ...(d.recentAlerts || [])].slice(0, 10) } : d));
  }, []));

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const onPick = (p) => {
    setCoords({ lat: p.lat, lng: p.lng });
    setName(p.name);
    load(p.id, { lat: p.lat, lng: p.lng });
  };

  const evaluateNow = async () => {
    try {
      const r = await api('/alerts/evaluate', { method: 'POST', body: {} });
      setToast(r.raised?.length ? `${r.raised.length} alert(s) raised` : 'Checked — no thresholds crossed');
      load(data?.activeLocation?.id, coords);
    } catch (e) { setToast(e.message); }
  };

  const wx = data?.weather;
  const cur = wx?.current;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row spread">
        <h1 style={{ margin: 0 }}>{t('dashboard')}</h1>
        <button className="btn ghost sm" onClick={evaluateNow}>⚡ {t('evaluateNow')}</button>
      </div>

      <div className="card">
        <LocationPicker
          locations={data?.locations || []}
          activeId={data?.activeLocation?.id}
          onPick={onPick}
          onSaved={() => load()}
        />
      </div>

      {loading && <div className="card"><p className="muted">Loading weather…</p></div>}

      {cur && (
        <>
          {/* Current conditions hero (FR-39) */}
          <div className="hero">
            <div className="sun" />
            <div className="row spread" style={{ position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ opacity: 0.9 }}>{name || 'Current location'}</div>
                <div className="hero-temp">{Math.round(cur.temperature)}°</div>
                <div style={{ fontSize: '1.4rem' }}>{weatherEmoji(cur.weatherCode)} </div>
              </div>
              <div style={{ fontSize: '4.5rem', lineHeight: 1 }}>{weatherEmoji(cur.weatherCode)}</div>
            </div>
            <div className="hero-meta">
              <div><strong>{cur.rainProbability}%</strong>{t('rainChance')}</div>
              <div><strong>{Math.round(cur.windSpeed)} km/h</strong>{t('wind')}</div>
              <div><strong>{cur.humidity}%</strong>{t('feelsLike')}</div>
              <div><strong>{cur.stormProbability}%</strong>{t('storm')}</div>
              <div><strong>{cur.uvIndex}</strong>{t('uv')}</div>
            </div>
            <div style={{ marginTop: 12, fontSize: '0.75rem', opacity: 0.8, position: 'relative', zIndex: 1 }}>
              Source: {wx.source} · updated {new Date(wx.updatedAt).toLocaleTimeString()}
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid cols-4">
            {[
              ['🌧️', `${cur.rainProbability}%`, t('rainChance')],
              ['💨', `${Math.round(cur.windSpeed)}`, `${t('wind')} km/h`],
              ['💧', `${cur.humidity}%`, t('feelsLike')],
              ['☀️', `${cur.uvIndex}`, t('uv')],
            ].map(([e, v, l]) => (
              <div key={l} className="card stat">
                <div style={{ fontSize: '1.6rem' }}>{e}</div>
                <div className="v">{v}</div>
                <div className="l">{l}</div>
              </div>
            ))}
          </div>

          {/* Hourly (FR-40) */}
          <div className="card">
            <div className="card-title">{t('hourly')}</div>
            <div className="hscroll">
              {wx.hourly.map((h, i) => (
                <div key={i} className="hour">
                  <div className="t">{i === 0 ? 'Now' : hourLabel(h.time)}</div>
                  <div className="e">{weatherEmoji(h.weatherCode, new Date(h.time).getHours())}</div>
                  <div className="deg">{Math.round(h.temperature)}°</div>
                  <div className="pop">💧{h.rainProbability}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* 7-day (FR-41) */}
          <div className="card">
            <div className="card-title">{t('sevenDay')}</div>
            {wx.daily.map((d, i) => (
              <div key={i} className="day-row">
                <span className="dname">{i === 0 ? 'Today' : dayName(d.date, lang)}</span>
                <span style={{ fontSize: '1.3rem' }}>{weatherEmoji(d.weatherCode)}</span>
                <span className="bar"><span style={{ width: `${Math.min(100, d.rainProbability)}%` }} /></span>
                <span className="muted" style={{ fontSize: '0.82rem', width: 54, textAlign: 'right' }}>💧{d.rainProbability}%</span>
                <span style={{ width: 64, textAlign: 'right' }}>
                  <strong>{Math.round(d.tempMax)}°</strong> <span className="muted">{Math.round(d.tempMin)}°</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent alerts (FR-43 preview) */}
      <div className="card">
        <div className="card-title">{t('recentAlerts')}</div>
        {(data?.recentAlerts || []).length === 0 && <p className="muted">{t('noAlerts')}</p>}
        {(data?.recentAlerts || []).map((a) => (
          <div key={a.id} className={`alert-item ${a.severity}`}>
            <span style={{ fontSize: '1.5rem' }}>{weatherEmoji(null)}</span>
            <div style={{ flex: 1 }}>
              <div className="row spread">
                <strong>{a.alert_type.replace(/_/g, ' ')}</strong>
                <span className={`badge ${a.severity}`}>{a.severity}</span>
              </div>
              <div style={{ fontSize: '0.9rem' }}>{a.message_text}</div>
              {a.advice_text && <div className="advice">💡 {a.advice_text}</div>}
            </div>
          </div>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
