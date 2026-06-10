import { useState, useCallback, useEffect } from 'react';
import * as auth from '../lib/auth.js';
import * as cloud from '../lib/cloud.js';
import { hasSupabase } from '../lib/supabase.js';
import { setActiveUser } from '../lib/storage.js';

// Owns who's signed in, transparently over two backends:
//   • Supabase configured → real cloud accounts (email + password, cross-device).
//   • Otherwise → on-device accounts (PBKDF2 in this browser).
// Either way it points storage at the active account before exposing the user,
// so the wellness store loads the right data.
export function useAuth() {
  const [user, setUser] = useState(() => {
    if (hasSupabase) return null;            // cloud session is restored async below
    const s = auth.getSession();
    setActiveUser(s?.id ?? null);
    return s;
  });
  // Only the cloud path needs an async restore, so only it starts "loading".
  const [loading, setLoading] = useState(hasSupabase);

  useEffect(() => {
    if (!hasSupabase) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await cloud.getCloudSession();
        if (!cancelled && s) { setActiveUser(s.id); setUser(s); }
      } catch { /* not signed in */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const enter = useCallback((session, opts = {}) => {
    if (!hasSupabase) auth.setSession(session);   // cloud manages its own session token
    setActiveUser(session.id);
    setUser({ ...session, ...opts });
  }, []);

  // identifier = email (cloud) or username (on-device). Returns { needsConfirm }
  // when cloud sign-up requires email verification before first login.
  const signup = useCallback(async (name, identifier, password) => {
    if (hasSupabase) {
      const res = await cloud.cloudSignUp(name, identifier, password);
      if (res.needsConfirm) return { needsConfirm: true };
      enter(res, { isNew: true });
      return {};
    }
    const session = await auth.createAccount(name, identifier, password);
    enter(session, { isNew: true });
    return {};
  }, [enter]);

  const login = useCallback(async (identifier, password) => {
    const session = hasSupabase
      ? await cloud.cloudSignIn(identifier, password)
      : await auth.verifyCredentials(identifier, password);
    enter(session);
  }, [enter]);

  const guest = useCallback(() => enter({ id: 'guest', name: 'Guest', guest: true }), [enter]);

  const logout = useCallback(async () => {
    if (hasSupabase) { try { await cloud.cloudSignOut(); } catch { /* ignore */ } }
    else auth.clearSession();
    setActiveUser(null);
    setUser(null);
  }, []);

  // Clear the freshly-onboarded flag once setup finishes.
  const clearNew = useCallback(() => setUser((u) => (u ? { ...u, isNew: false } : u)), []);

  return { user, loading, signup, login, guest, logout, clearNew };
}
