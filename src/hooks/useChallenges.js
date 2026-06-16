import { useState, useEffect, useCallback, useRef } from 'react';
import { hasSupabase } from '../lib/supabase.js';
import * as ch from '../lib/challenges.js';
import { todayProgress } from '../lib/challenges.js';
import { todayKey } from '../lib/dates.js';

// Owns the Challenges experience for a cloud account: the challenges you're in,
// your pending invites, and each challenge's live standings. Also publishes YOUR
// own daily progress for every running challenge as your day changes, so the
// leaderboard reflects today without a server cron.
//
// Inert for guests / on-device accounts — `enabled` is false and the screen
// shows a gentle "needs a cloud account" prompt.
export function useChallenges({ user, state }) {
  const enabled = hasSupabase && !!user?.cloud && !user?.guest;
  const userId = enabled ? user.id : null;

  const [list, setList] = useState([]);          // get_my_challenges rows
  const [invites, setInvites] = useState([]);    // pending invites to me
  const [standings, setStandings] = useState({}); // challengeId -> standings rows
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [mine, inv] = await Promise.all([ch.getMyChallenges(), ch.getInvites()]);
      setList(mine);
      setInvites(inv);
      const entries = await Promise.all(mine.map(async (c) => [c.id, await ch.getStandings(c.id).catch(() => [])]));
      setStandings(Object.fromEntries(entries));
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load your challenges.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    refresh();
    const id = setInterval(refresh, 30000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [enabled, refresh]);

  // Publish my own daily progress for every active, currently-running challenge
  // whenever my day changes. Debounced, and skipped when the value/hit haven't
  // changed since the last push, so idle re-renders don't hammer the table.
  const pubTimer = useRef(null);
  const lastPub = useRef({});
  useEffect(() => {
    if (!enabled || !list.length) return;
    clearTimeout(pubTimer.current);
    pubTimer.current = setTimeout(() => {
      const today = todayKey();
      for (const c of list) {
        if (today < c.starts || today > c.ends) continue; // outside its window
        const { value, hit } = todayProgress(c.metric, c.goal, state);
        const sig = `${c.id}:${value}:${hit}`;
        if (lastPub.current[c.id] === sig) continue;
        lastPub.current[c.id] = sig;
        ch.publishProgress(c.id, userId, today, value, hit)
          .catch((e) => console.warn('Challenge progress publish failed:', e.message));
      }
    }, 1200);
    return () => clearTimeout(pubTimer.current);
  }, [enabled, list, state, userId]);

  // ---- Actions (each refreshes so the UI reflects the new state) ----
  const create  = useCallback(async (opts) => { const c = await ch.createChallenge(userId, opts); await refresh(); return c; }, [userId, refresh]);
  const invite  = useCallback(async (cid, handle) => { const r = await ch.inviteByHandle(cid, handle, userId); await refresh(); return r; }, [userId, refresh]);
  const accept  = useCallback(async (memberId) => { await ch.acceptInvite(memberId); await refresh(); }, [refresh]);
  const decline = useCallback(async (memberId) => { await ch.removeMember(memberId); await refresh(); }, [refresh]);
  const leave   = useCallback(async (cid) => { await ch.leaveChallenge(cid, userId); await refresh(); }, [userId, refresh]);
  const remove  = useCallback(async (cid) => { await ch.deleteChallenge(cid); await refresh(); }, [refresh]);

  return { enabled, loading, error, userId, list, invites, standings, create, invite, accept, decline, leave, remove, refresh };
}
