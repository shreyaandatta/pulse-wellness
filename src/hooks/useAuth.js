import { useState, useCallback } from 'react';
import * as auth from '../lib/auth.js';
import { setActiveUser } from '../lib/storage.js';

// Owns who's signed in. Points storage at the right account *synchronously*
// before exposing the user, so the wellness store always loads the correct
// data on the very first render.
export function useAuth() {
  const [user, setUser] = useState(() => {
    const s = auth.getSession();
    setActiveUser(s?.id ?? null);
    return s;
  });

  const enter = useCallback((session, opts = {}) => {
    auth.setSession(session);
    setActiveUser(session.id);
    setUser({ ...session, ...opts });
  }, []);

  const signup = useCallback(async (name, username, password) => {
    const session = await auth.createAccount(name, username, password);
    enter(session, { isNew: true });
  }, [enter]);

  const login = useCallback(async (username, password) => {
    const session = await auth.verifyCredentials(username, password);
    enter(session);
  }, [enter]);

  const guest = useCallback(() => enter({ id: 'guest', name: 'Guest', guest: true }), [enter]);

  const logout = useCallback(() => {
    auth.clearSession();
    setActiveUser(null);
    setUser(null);
  }, []);

  // Clear the freshly-onboarded flag once setup finishes.
  const clearNew = useCallback(() => setUser((u) => (u ? { ...u, isNew: false } : u)), []);

  return { user, signup, login, guest, logout, clearNew };
}
