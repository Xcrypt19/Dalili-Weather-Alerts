import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n.js';
import { api } from '../api/client.js';

export default function AuthPage() {
  const { t } = useI18n();
  const { login, register, guest } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [form, setForm] = useState({
    email: '', phone: '', password: '', role: 'general', language: 'en', useEmail: true,
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      if (mode === 'login') {
        const creds = form.useEmail ? { email: form.email, password: form.password } : { phone: form.phone, password: form.password };
        await login(creds);
        navigate('/');
      } else if (mode === 'register') {
        const body = { password: form.password, role: form.role, language: form.language };
        if (form.useEmail) body.email = form.email; else body.phone = form.phone;
        await register(body);
        navigate('/');
      } else {
        const res = await api('/users/forgot-password', { method: 'POST', body: { email: form.email }, auth: false });
        setNotice(res.devResetToken ? `Reset link sent. Dev token: ${res.devResetToken}` : res.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function doGuest() {
    setBusy(true);
    try { await guest(); navigate('/'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">
          <img src="/favicon.svg" alt="" /> Dalili
        </div>
        <p className="muted" style={{ textAlign: 'center', marginTop: -8 }}>{t('welcome')}</p>

        {mode !== 'forgot' && (
          <div className="seg">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>{t('login')}</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>{t('register')}</button>
          </div>
        )}

        <form onSubmit={submit}>
          {mode !== 'forgot' && (
            <div className="seg" style={{ marginBottom: 14 }}>
              <button type="button" className={form.useEmail ? 'active' : ''} onClick={() => setForm({ ...form, useEmail: true })}>{t('email')}</button>
              <button type="button" className={!form.useEmail ? 'active' : ''} onClick={() => setForm({ ...form, useEmail: false })}>{t('phone')}</button>
            </div>
          )}

          {(form.useEmail || mode === 'forgot') ? (
            <div className="field">
              <label>{t('email')}</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            </div>
          ) : (
            <div className="field">
              <label>{t('phone')}</label>
              <input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="07XX XXX XXX" required />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="field">
              <label>{t('password')}</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" minLength={8} required />
            </div>
          )}

          {mode === 'register' && (
            <>
              <div className="field">
                <label>{t('role')}</label>
                <select className="input" value={form.role} onChange={set('role')}>
                  <option value="farmer">{t('farmer')}</option>
                  <option value="business">{t('business')}</option>
                  <option value="pilot">{t('pilot')}</option>
                  <option value="general">{t('general')}</option>
                </select>
              </div>
              <div className="field">
                <label>{t('language')}</label>
                <select className="input" value={form.language} onChange={set('language')}>
                  <option value="en">English</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </div>
            </>
          )}

          {error && <p style={{ color: 'var(--sev-emergency)', fontWeight: 600 }}>{error}</p>}
          {notice && <p style={{ color: 'var(--sky-700)', fontWeight: 600 }}>{notice}</p>}

          <button className="btn block" disabled={busy} type="submit">
            {mode === 'login' ? t('login') : mode === 'register' ? t('register') : 'Send reset link'}
          </button>
        </form>

        <div className="row spread" style={{ marginTop: 14 }}>
          {mode !== 'forgot' ? (
            <button className="pill" onClick={() => setMode('forgot')}>{t('forgot')}</button>
          ) : (
            <button className="pill" onClick={() => setMode('login')}>← {t('login')}</button>
          )}
          <button className="btn ghost sm" disabled={busy} onClick={doGuest}>{t('guest')}</button>
        </div>
      </div>
    </div>
  );
}
