import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n.js';

const PARAM_LABEL = {
  rain_probability: 'Rain probability',
  rainfall: 'Rainfall',
  wind_speed: 'Wind speed',
  storm_probability: 'Storm probability',
  temperature: 'Temperature',
  humidity: 'Humidity',
};
const PARAM_UNIT = {
  rain_probability: '%', rainfall: 'mm', wind_speed: 'km/h',
  storm_probability: '%', temperature: '°C', humidity: '%',
};

export default function AlertsPage() {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [params, setParams] = useState([]);
  const [days, setDays] = useState(30);
  const [draft, setDraft] = useState({ parameter: 'rain_probability', comparator: 'gt', threshold_value: 70 });
  const [toast, setToast] = useState('');

  const loadAll = useCallback(async () => {
    const [h, th] = await Promise.all([
      api(`/alerts/history?days=${days}`),
      api('/alerts/thresholds'),
    ]);
    setAlerts(h.alerts);
    setThresholds(th.thresholds.length ? th.thresholds : th.defaults.map((d) => ({ ...d, isDefault: true })));
    setParams(th.parameters);
  }, [days]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveThreshold = async () => {
    await api('/alerts/thresholds', {
      method: 'PUT',
      body: { ...draft, threshold_value: Number(draft.threshold_value), unit: PARAM_UNIT[draft.parameter] },
    });
    setToast('Threshold saved');
    loadAll();
  };
  const resetThresholds = async () => {
    await api('/alerts/thresholds/reset', { method: 'POST' });
    setToast('Reset to defaults');
    loadAll();
  };
  const removeThreshold = async (p) => {
    await api(`/alerts/thresholds/${p}`, { method: 'DELETE' });
    loadAll();
  };

  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 3000); return () => clearTimeout(id); } }, [toast]);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1 style={{ margin: 0 }}>{t('alerts')}</h1>

      {/* Threshold editor (FR-04) */}
      <div className="card">
        <div className="card-title">{t('thresholds')}</div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
            <label>Parameter</label>
            <select className="input" value={draft.parameter} onChange={(e) => setDraft({ ...draft, parameter: e.target.value })}>
              {params.map((p) => <option key={p} value={p}>{PARAM_LABEL[p] || p}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, width: 110 }}>
            <label>When</label>
            <select className="input" value={draft.comparator} onChange={(e) => setDraft({ ...draft, comparator: e.target.value })}>
              <option value="gt">above</option>
              <option value="lt">below</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, width: 120 }}>
            <label>Value ({PARAM_UNIT[draft.parameter]})</label>
            <input className="input" type="number" value={draft.threshold_value} onChange={(e) => setDraft({ ...draft, threshold_value: e.target.value })} />
          </div>
          <button className="btn" onClick={saveThreshold}>{t('save')}</button>
          <button className="btn ghost" onClick={resetThresholds}>{t('reset')}</button>
        </div>

        <div className="stack" style={{ marginTop: 16 }}>
          {thresholds.map((th) => (
            <div key={th.parameter} className="row spread" style={{ background: 'var(--cloud-0)', padding: '10px 14px', borderRadius: 10 }}>
              <span>
                <strong>{PARAM_LABEL[th.parameter] || th.parameter}</strong>{' '}
                {th.comparator === 'lt' ? 'below' : 'above'} {th.threshold_value}{th.unit || PARAM_UNIT[th.parameter]}
                {th.isDefault && <span className="muted"> (default)</span>}
              </span>
              {!th.isDefault && <button className="pill" onClick={() => removeThreshold(th.parameter)}>Remove</button>}
            </div>
          ))}
        </div>
      </div>

      {/* History (FR-43) */}
      <div className="card">
        <div className="row spread">
          <div className="card-title" style={{ margin: 0 }}>{t('recentAlerts')}</div>
          <div className="row">
            {[7, 30, 90].map((d) => (
              <button key={d} className={`pill ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>{d}d</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          {alerts.length === 0 && <p className="muted">{t('noAlerts')}</p>}
          {alerts.map((a) => (
            <div key={a.id} className={`alert-item ${a.severity}`}>
              <div style={{ flex: 1 }}>
                <div className="row spread">
                  <strong>{a.alert_type.replace(/_/g, ' ')} {a.location_name ? `· ${a.location_name}` : ''}</strong>
                  <span className={`badge ${a.severity}`}>{a.severity}</span>
                </div>
                <div style={{ fontSize: '0.9rem' }}>{a.message_text}</div>
                {a.advice_text && <div className="advice">💡 {a.advice_text}</div>}
                <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>{new Date(a.time_sent).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
