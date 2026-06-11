import { useState, useEffect, useCallback, useRef } from 'react';
import { hasSupabase, supabase } from '../lib/supabase.js';
import { hasRazorpay } from '../lib/billing.js';

// Reads the server's verdict on whether this account has Plus. Active only for a
// signed-in cloud account with real billing configured; otherwise inert and the
// app falls back to the local demo flag. The entitlements row is read-only to
// the user (only the webhook writes it), so this can't be tampered with.
export function useEntitlement({ user }) {
  const enabled = hasSupabase && hasRazorpay && !!user?.cloud && !user?.guest;
  const userId = enabled ? user.id : null;

  const [ent, setEnt] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!userId) return null;
    const { data } = await supabase
      .from('entitlements')
      .select('plan,status,plus_until,rzp_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();
    setEnt(data || null);
    setLoading(false);
    return data || null;
  }, [userId]);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, refresh]);

  // After a checkout the webhook lands a moment later — poll briefly until the
  // entitlement turns active (or we give up and let a focus/refresh catch it).
  const pollUntilActive = useCallback(() => {
    if (!userId) return;
    let tries = 0;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      tries += 1;
      const row = await refresh();
      const active = row?.plus_until && new Date(row.plus_until) > new Date();
      if (active || tries >= 20) clearInterval(pollRef.current);
    }, 2000);
  }, [userId, refresh]);
  useEffect(() => () => clearInterval(pollRef.current), []);

  const plus = !!(ent?.plus_until && new Date(ent.plus_until) > new Date());

  return {
    enabled,
    loading,
    plus,
    plusUntil: ent?.plus_until || null,
    status: ent?.status || null,
    hasSubscription: !!ent?.rzp_subscription_id,
    cancelling: ent?.status === 'cancelling',
    refresh,
    pollUntilActive,
  };
}
