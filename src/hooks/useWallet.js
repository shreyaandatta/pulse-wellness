// Client side of the server-authoritative Sparks wallet. Cloud accounts only.
// The server owns the balance; this hook reads it and relays buy/equip/freeze
// actions, mirroring whatever wallet the server returns into app state
// (state.wallet) so every bit of display code keeps working unchanged. Editing
// that mirror in DevTools only shows a fake number until the next sync — it can
// never actually buy anything, because the server validates against its own row.
import { useCallback, useEffect, useRef } from 'react';
import { supabase, hasSupabase } from '../lib/supabase.js';

async function sparksApi(action, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Please sign in.');
  const res = await fetch('/api/sparks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...(body || {}) }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(j.error || 'Something went wrong.'); e.wallet = j.wallet; throw e; }
  return j;
}

export function useWallet({ cloudUserId, setWallet, notify, earnSignature }) {
  const enabled = hasSupabase && !!cloudUserId;
  const balRef = useRef(null);

  const apply = useCallback((wallet, { announceEarn = false } = {}) => {
    if (!wallet) return;
    if (announceEarn && balRef.current != null && wallet.balance > balRef.current) {
      notify?.(`+${wallet.balance - balRef.current} Sparks`, '⚡');
    }
    balRef.current = wallet.balance;
    setWallet(wallet);
  }, [setWallet, notify]);

  const refresh = useCallback(async ({ announceEarn = false } = {}) => {
    if (!enabled) return;
    try { const { wallet } = await sparksApi('sync'); apply(wallet, { announceEarn }); } catch { /* offline — keep the mirror */ }
  }, [enabled, apply]);

  const act = useCallback(async (action, body) => {
    if (!enabled) { notify?.('Sign in to earn & spend Sparks', '🔒'); return false; }
    try { const { wallet } = await sparksApi(action, body); apply(wallet); return true; }
    catch (e) { if (e.wallet) apply(e.wallet); notify?.(e.message, '⚠️'); return false; }
  }, [enabled, apply, notify]);

  // Initial load + whenever the active cloud account changes.
  useEffect(() => { balRef.current = null; if (enabled) refresh(); /* eslint-disable-next-line */ }, [cloudUserId, enabled]);

  // Re-sync earns a few seconds after the user logs something — long enough for
  // useCloudSync to have pushed the state blob the server reads earns from.
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => refresh({ announceEarn: true }), 6000);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [earnSignature, enabled]);

  // Catch earns/expiries on return to the app (e.g. a boost window ending).
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => refresh({ announceEarn: true });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, refresh]);

  return {
    enabled,
    refresh,
    buy: (itemId) => act('buy', { itemId }),
    equip: (slot, value) => act('equip', { slot, value }),
    freeze: (day) => act('freeze', { day }),
    applyWallet: (wallet) => apply(wallet),  // after a verified Spark-pack purchase
  };
}
