import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { I18nContext, makeT } from './i18n.js';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MapPage from './pages/MapPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

const NAV = [
  { to: '/', key: 'dashboard', ico: '🌤️', end: true },
  { to: '/map', key: 'map', ico: '🗺️' },
  { to: '/alerts', key: 'alerts', ico: '🔔' },
  { to: '/history', key: 'history', ico: '📊' },
  { to: '/settings', key: 'settings', ico: '⚙️' },
];

function Shell({ children, t }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const doLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/favicon.svg" alt="" />
          <div>
            Dalili
            <small>weather alerts</small>
          </div>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="ico">{n.ico}</span> {t(n.key)}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <button className="nav-link" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={doLogout}>
            <span className="ico">🚪</span> {t('logout')}
          </button>
        </div>
      </aside>

      <header className="topbar">
        <strong style={{ fontSize: '1.1rem', color: 'var(--sky-700)' }}>
          {user?.is_guest ? 'Guest' : user?.email || user?.phone}
        </strong>
        <span className="pill">{t(user?.role || 'general')}</span>
      </header>

      <main className="main">{children}</main>

      <nav className="bottom-nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="ico">{n.ico}</span>
            {t(n.key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const lang = user?.language || 'en';
  const t = makeT(lang);

  if (loading) {
    return (
      <div className="auth-wrap">
        <div className="card auth-card" style={{ textAlign: 'center' }}>
          <div className="brand">
            <img src="/favicon.svg" alt="" /> Dalili
          </div>
          <p className="muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <I18nContext.Provider value={{ lang, t }}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ lang, t }}>
      <Shell t={t}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </I18nContext.Provider>
  );
}
