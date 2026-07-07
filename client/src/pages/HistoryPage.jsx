import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { api, API_BASE, tokenStore } from '../api/client.js';
import { useI18n } from '../i18n.js';

export default function HistoryPage() {
  const { t } = useI18n();
  const [locations, setLocations] = useState([]);
  const [locId, setLocId] = useState('');
  const [months, setMonths] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api('/locations').then(({ locations }) => {
      setLocations(locations);
      if (locations[0]) setLocId(locations[0].id);
    });
  }, []);

  const loadMonthly = useCallback(async (id) => {
    if (!id) return;
    const { months } = await api(`/history/${id}/monthly`);
    setMonths(months.map((m) => ({
      month: m.month,
      rainfall: Number(m.total_rainfall),
      avgTemp: Number(m.avg_temp),
      maxTemp: Number(m.max_temp),
      minTemp: Number(m.min_temp),
    })));
  }, []);

  useEffect(() => { loadMonthly(locId); }, [locId, loadMonthly]);

  const backfill = async () => {
    await api(`/history/${locId}/backfill`, { method: 'POST', body: { days: 1095 } });
    setToast('Sample 3-year history generated');
    loadMonthly(locId);
  };

  const exportCsv = async () => {
    const res = await fetch(`${API_BASE}/history/${locId}/export`, {
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dalili-history.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 3000); return () => clearTimeout(id); } }, [toast]);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1 style={{ margin: 0 }}>{t('history')}</h1>

      <div className="card">
        <div className="row spread">
          <div className="field" style={{ marginBottom: 0, minWidth: 220 }}>
            <label>{t('savedLocations')}</label>
            <select className="input" value={locId} onChange={(e) => setLocId(e.target.value)}>
              {locations.length === 0 && <option>No saved locations</option>}
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="row">
            <button className="btn ghost sm" onClick={backfill} disabled={!locId}>🧪 {t('backfill')}</button>
            <button className="btn accent sm" onClick={exportCsv} disabled={!locId}>⬇️ {t('export')}</button>
          </div>
        </div>
      </div>

      {months.length === 0 ? (
        <div className="card"><p className="muted">No historical data yet. Use “{t('backfill')}” to populate sample data, or it accumulates daily.</p></div>
      ) : (
        <>
          <div className="card">
            <div className="card-title">{t('monthlyTrends')} — Rainfall (mm)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="rainfall" fill="#0b6cb0" radius={[4, 4, 0, 0]} name="Rainfall (mm)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title">Temperature range (°C)</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="maxTemp" stroke="#f0792b" name="Max" dot={false} />
                <Line type="monotone" dataKey="avgTemp" stroke="#f6b53a" name="Avg" dot={false} />
                <Line type="monotone" dataKey="minTemp" stroke="#38a8e8" name="Min" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
