import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!tokenStore.access) {
      setLoading(false);
      return;
    }
    try {
      const { user } = await api('/users/me');
      setUser(user);
    } catch {
      tokenStore.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const afterAuth = (data) => {
    tokenStore.set(data);
    setUser(data.user);
    return data.user;
  };

  const login = async (creds) => afterAuth(await api('/users/login', { method: 'POST', body: creds, auth: false }));
  const register = async (body) => afterAuth(await api('/users/register', { method: 'POST', body, auth: false }));
  const guest = async () => afterAuth(await api('/users/guest', { method: 'POST', auth: false }));

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  const updateUser = async (patch) => {
    const { user } = await api('/users/me', { method: 'PATCH', body: patch });
    setUser(user);
    return user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, guest, logout, updateUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
