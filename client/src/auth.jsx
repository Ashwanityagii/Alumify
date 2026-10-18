import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, tokenStore } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export const homeFor = (role) => (role === 'admin' ? '/admin' : `/${role}`);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener('alumify:signout', out);
    if (!tokenStore.get()) setReady(true);
    else api('/me').then((d) => setUser(d.user)).catch(() => tokenStore.clear()).finally(() => setReady(true));
    return () => window.removeEventListener('alumify:signout', out);
  }, []);

  const login = useCallback(async (email, password, role, admin = false) => {
    const d = await api(admin ? '/auth/admin-login' : '/auth/login', { method: 'POST', body: { email, password, role } });
    tokenStore.set(d.token); setUser(d.user); return d.user;
  }, []);
  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}
