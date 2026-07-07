// Lightweight API client with automatic token refresh.
const BASE = import.meta.env.VITE_API_BASE || '/api';

const store = {
  get access() {
    return localStorage.getItem('dalili_access');
  },
  get refresh() {
    return localStorage.getItem('dalili_refresh');
  },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem('dalili_access', accessToken);
    if (refreshToken) localStorage.setItem('dalili_refresh', refreshToken);
  },
  clear() {
    localStorage.removeItem('dalili_access');
    localStorage.removeItem('dalili_refresh');
  },
};

async function tryRefresh() {
  if (!store.refresh) return false;
  const r = await fetch(`${BASE}/users/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: store.refresh }),
  });
  if (!r.ok) return false;
  const data = await r.json();
  store.set(data);
  return true;
}

export async function api(path, { method = 'GET', body, auth = true, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && store.access) headers.Authorization = `Bearer ${store.access}`;

  let res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // One transparent refresh + retry on 401.
  if (res.status === 401 && auth && (await tryRefresh())) {
    headers.Authorization = `Bearer ${store.access}`;
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  if (raw) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const tokenStore = store;
export const API_BASE = BASE;
