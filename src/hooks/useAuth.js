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

  // True when the user arrived via a password-reset link — the app then shows
  // the "set a new password" screen instead of signing them straight in. We seed
  // it synchronously from the URL hash to avoid a flash, and also listen for the
  // PASSWORD_RECOVERY event as the reliable signal.
  const [recovery, setRecovery] = useState(
    () => hasSupabase && typeof window !== 'undefined' && /type=recovery/.test(window.location.hash)
  );

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

  useEffect(() => {
    if (!hasSupabase) return;
    return cloud.onPasswordRecovery(() => setRecovery(true));
  }, []);

  // Strip the recovery token from the URL once we're done with it.
  const cleanUrl = () => {
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

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

  // Email a reset link (cloud only). Lands back at this app's origin.
  const resetPassword = useCallback(
    (email) => cloud.cloudResetPassword(email, typeof window !== 'undefined' ? window.location.origin : undefined),
    []
  );

  // Save the new password during a recovery visit, then drop the user into the app.
  const completeRecovery = useCallback(async (password) => {
    const session = await cloud.cloudUpdatePassword(password);
    setRecovery(false);
    cleanUrl();
    if (session) { setActiveUser(session.id); setUser(session); }
  }, []);

  // Bail out of a recovery visit without changing anything.
  const cancelRecovery = useCallback(async () => {
    setRecovery(false);
    cleanUrl();
    try { await cloud.cloudSignOut(); } catch { /* ignore */ }
    setActiveUser(null);
    setUser(null);
  }, []);

  return { user, loading, recovery, signup, login, guest, logout, clearNew, resetPassword, completeRecovery, cancelRecovery };
}
