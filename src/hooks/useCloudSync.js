import { useEffect, useRef } from 'react';
import { hasSupabase } from '../lib/supabase.js';
import { loadCloudState, saveCloudState } from '../lib/cloud.js';

// Keeps a signed-in cloud account's data in sync with the server.
//   • On sign-in: pull the cloud copy (the source of truth). If it exists, adopt
//     it; if this account has never synced, seed the cloud from what's local.
//   • Afterwards: push local changes up, debounced so a flurry of taps becomes
//     one write.
// A no-op for guests and for on-device accounts (cloudUserId is null).
export function useCloudSync({ cloudUserId, state, replaceAll }) {
  const ready = useRef(false);   // gate saves until the initial pull settles
  const timer = useRef(null);

  // Initial pull / seed, re-run whenever the active cloud user changes.
  useEffect(() => {
    if (!hasSupabase || !cloudUserId) return;
    let cancelled = false;
    ready.current = false;
    (async () => {
      try {
        const cloud = await loadCloudState(cloudUserId);
        if (cancelled) return;
        if (cloud) replaceAll(cloud);                 // adopt the cloud copy
        else await saveCloudState(cloudUserId, state); // first device — seed it
      } catch (e) {
        console.warn('Cloud sync (load) failed:', e.message);
      } finally {
        if (!cancelled) ready.current = true;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudUserId]);

  // Push on change, debounced.
  useEffect(() => {
    if (!hasSupabase || !cloudUserId || !ready.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveCloudState(cloudUserId, state).catch((e) => console.warn('Cloud sync (save) failed:', e.message));
    }, 800);
    return () => clearTimeout(timer.current);
  }, [state, cloudUserId]);
}
