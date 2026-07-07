import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n.js';

function Toggle({ label, checked, onChange }) {
  return (
    <label className="row spread" style={{ background: 'var(--cloud-0)', padding: '12px 14px', borderRadius: 10, cursor: 'pointer' }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20 }} />
    </label>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const { user, updateUser, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(user);
  const [locations, setLocations] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [hookUrl, setHookUrl] = useState('');
  const [toast, setToast] = useState('');
  // SMS verification flow (FR-26)
  const [phoneInput, setPhoneInput] = useState(user?.phone || '');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [smsMsg, setSmsMsg] = useState('');
  const [smsBusy, setSmsBusy] = useState(false);

  const reload = useCallback(async () => {
    const [{ locations }, wh] = await Promise.all([
      api('/locations'),
      api('/webhooks').catch(() => ({ webhooks: [] })),
    ]);
    setLocations(locations);
    setWebhooks(wh.webhooks || []);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { setForm(user); setPhoneInput(user?.phone || ''); }, [user]);

  const save = async (patch) => {
    await updateUser(patch);
    setToast(t('save') + ' ✓');
  };
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 2500); return () => clearTimeout(id); } }, [toast]);

  const setPrimary = async (id) => { await api(`/locations/${id}`, { method: 'PATCH', body: { is_primary: true } }); reload(); };
  const delLocation = async (id) => { await api(`/locations/${id}`, { method: 'DELETE' }); reload(); };

  const addWebhook = async () => {
    if (!hookUrl) return;
    await api('/webhooks', { method: 'POST', body: { target_url: hookUrl } });
    setHookUrl(''); reload();
  };
  const delWebhook = async (id) => { await api(`/webhooks/${id}`, { method: 'DELETE' }); reload(); };

  const sendCode = async () => {
    setSmsBusy(true); setSmsMsg('');
    try {
      const r = await api('/users/phone/request-otp', { method: 'POST', body: { phone: phoneInput } });
      setCodeSent(true);
      setDevOtp(r.devOtp || '');
      setSmsMsg(r.message);
    } catch (e) { setSmsMsg(e.message); }
    finally { setSmsBusy(false); }
  };

  const verifyCode = async () => {
    setSmsBusy(true); setSmsMsg('');
    try {
      const r = await api('/users/phone/verify-otp', { method: 'POST', body: { code: otp } });
      setUser(r.user);
      setCodeSent(false); setOtp(''); setDevOtp('');
      setSmsMsg(r.message);
    } catch (e) { setSmsMsg(e.message); }
    finally { setSmsBusy(false); }
  };

  const deleteAccount = async () => {
    if (!confirm('Permanently delete your account and all data?')) return;
    await api('/users/me', { method: 'DELETE' });
    logout();
    navigate('/login');
  };

  if (!form) return null;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1 style={{ margin: 0 }}>{t('settings')}</h1>

      {/* Profile (FR-03, FR-06) */}
      <div className="card">
        <div className="card-title">{t('profile')}</div>
        <div className="grid cols-2">
          <div className="field">
            <label>{t('role')}</label>
            <select className="input" value={form.role} onChange={(e) => save({ role: e.target.value })}>
              <option value="farmer">{t('farmer')}</option>
              <option value="business">{t('business')}</option>
              <option value="pilot">{t('pilot')}</option>
              <option value="general">{t('general')}</option>
            </select>
          </div>
          <div className="field">
            <label>{t('language')}</label>
            <select className="input" value={form.language} onChange={(e) => save({ language: e.target.value })}>
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
          </div>
          {!user.is_guest && (
            <div className="field">
              <label>{t('email')}</label>
              <input className="input" defaultValue={form.email || ''} onBlur={(e) => e.target.value !== form.email && save({ email: e.target.value })} />
            </div>
          )}
        </div>
      </div>

      {/* SMS alerts — verified Kenyan number (FR-26) */}
      {!user.is_guest && (
        <div className="card">
          <div className="card-title">
            💬 {t('smsAlerts')}{' '}
            {form.phone && (
              <span className="pill" style={{ marginLeft: 8 }}>
                {form.phone_verified ? `✅ ${t('verifiedPhone')}` : `⚠️ ${t('notVerified')}`}
              </span>
            )}
          </div>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>{t('smsExplain')}</p>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input
              className="input"
              type="tel"
              placeholder="07XX XXX XXX"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
            <button className="btn sm" onClick={sendCode} disabled={smsBusy || !phoneInput.trim()}>
              {t('sendCode')}
            </button>
          </div>
          {codeSent && (
            <div className="row" style={{ flexWrap: 'nowrap', marginTop: 10 }}>
              <input
                className="input"
                inputMode="numeric"
                maxLength={6}
                placeholder={t('enterCode')}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              <button className="btn accent sm" onClick={verifyCode} disabled={smsBusy || otp.length !== 6}>
                {t('verifyCode')}
              </button>
            </div>
          )}
          {devOtp && (
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
              Dev mode (no SMS provider configured) — your code is <strong>{devOtp}</strong>
            </p>
          )}
          {smsMsg && <p style={{ color: 'var(--sky-700)', fontWeight: 600, fontSize: '0.85rem', marginTop: 8 }}>{smsMsg}</p>}
        </div>
      )}

      {/* Channels (FR-29) */}
      <div className="card">
        <div className="card-title">{t('channels')}</div>
        <div className="stack">
          <Toggle label={`📲 ${t('push')}`} checked={form.push_enabled} onChange={(v) => save({ push_enabled: v })} />
          <Toggle label={`💬 ${t('sms')}`} checked={form.sms_enabled} onChange={(v) => save({ sms_enabled: v })} />
          <Toggle label={`📧 ${t('emailCh')}`} checked={form.email_enabled} onChange={(v) => save({ email_enabled: v })} />
        </div>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 10 }}>
          SMS alerts go to your verified phone number whenever an alert fires (FR-26).
        </p>
      </div>

      {/* Quiet hours (FR-24) */}
      <div className="card">
        <div className="card-title">{t('quietHours')}</div>
        <div className="row">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>From</label>
            <select className="input" value={form.quiet_start ?? ''} onChange={(e) => save({ quiet_start: e.target.value === '' ? null : Number(e.target.value) })}>
              <option value="">Off</option>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>To</label>
            <select className="input" value={form.quiet_end ?? ''} onChange={(e) => save({ quiet_end: e.target.value === '' ? null : Number(e.target.value) })}>
              <option value="">Off</option>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
        </div>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 10 }}>Non-emergency alerts are paused during these hours.</p>
      </div>

      {/* Saved locations (FR-05) */}
      <div className="card">
        <div className="card-title">{t('savedLocations')}</div>
        {locations.length === 0 && <p className="muted">No saved locations. Add one from the Dashboard or Map.</p>}
        <div className="stack">
          {locations.map((l) => (
            <div key={l.id} className="row spread" style={{ background: 'var(--cloud-0)', padding: '10px 14px', borderRadius: 10 }}>
              <span>{l.is_primary ? '⭐ ' : ''}<strong>{l.name}</strong> <span className="muted">{l.place_label || l.county || ''}</span></span>
              <div className="row">
                {!l.is_primary && <button className="pill" onClick={() => setPrimary(l.id)}>Make primary</button>}
                <button className="pill" onClick={() => delLocation(l.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Webhooks (FR-45) */}
      {!user.is_guest && (
        <div className="card">
          <div className="card-title">Webhooks (developer integration)</div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="input" placeholder="https://your-app.example/hooks/dalili" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} />
            <button className="btn sm" onClick={addWebhook}>Add</button>
          </div>
          <div className="stack" style={{ marginTop: 10 }}>
            {webhooks.map((w) => (
              <div key={w.id} className="row spread" style={{ background: 'var(--cloud-0)', padding: '10px 14px', borderRadius: 10 }}>
                <span style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{w.target_url}</span>
                <button className="pill" onClick={() => delWebhook(w.id)}>Delete</button>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
            Public weather API: <code>GET /api/public/v1/weather?lat=&lng=</code>
          </p>
        </div>
      )}

      {/* Danger zone (FR-06) */}
      {!user.is_guest && (
        <div className="card" style={{ borderLeft: '5px solid var(--sev-emergency)' }}>
          <div className="card-title" style={{ color: 'var(--sev-emergency)' }}>Danger zone</div>
          <button className="btn" style={{ background: 'var(--sev-emergency)' }} onClick={deleteAccount}>{t('deleteAccount')}</button>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
