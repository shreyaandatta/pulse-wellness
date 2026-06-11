import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { hasSupabase } from '../lib/supabase.js';
import * as social from '../lib/social.js';
import { buildSnapshot } from '../lib/summary.js';

// Owns the Friends experience for a cloud account: your profile/handle, your
// connections, incoming/outgoing requests, and the friends' snapshots. Also
// keeps your own published snapshot fresh as your day changes.
//
// Fully inert for guests and on-device accounts — `enabled` is false and the
// Friends tab shows a gentle "needs a cloud account" prompt instead.
export function useSocial({ user, state }) {
  const enabled = hasSupabase && !!user?.cloud && !user?.guest;
  const userId = enabled ? user.id : null;

  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);       // raw friendship rows
  const [people, setPeople] = useState({});     // id -> profile
  const [snaps, setSnaps] = useState({});       // friend id -> snapshot row
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  // Pull everything except the snapshot publish (that's a push, handled below).
  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [prof, rows] = await Promise.all([
        social.getMyProfile(userId),
        social.listFriendships(userId),
      ]);
      setProfile(prof);
      setLinks(rows);
      const otherIds = rows.map((f) => social.otherId(f, userId));
      const [map, snapMap] = await Promise.all([
        social.getProfilesByIds(otherIds),
        social.getFriendSnapshots(),
      ]);
      setPeople(map);
      setSnaps(snapMap);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load your friends.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load + a light poll so incoming requests and friends' check-ins
  // appear without a manual refresh.
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    refresh();
    const id = setInterval(refresh, 30000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [enabled, refresh]);

  // Publish my own curated snapshot whenever my day changes — but only once I've
  // claimed a handle (otherwise nobody can connect to me anyway). Debounced.
  const pubTimer = useRef(null);
  useEffect(() => {
    if (!enabled || !profile) return;
    clearTimeout(pubTimer.current);
    pubTimer.current = setTimeout(() => {
      const snap = buildSnapshot(state, profile.display_name || user.name);
      social.publishSnapshot(userId, snap).catch((e) => console.warn('Snapshot publish failed:', e.message));
    }, 1000);
    return () => clearTimeout(pubTimer.current);
  }, [enabled, profile, state, userId, user?.name]);

  // ---- Actions (each refreshes so the UI reflects the new state) ----

  const claim = useCallback(async (handle) => {
    const p = await social.claimUsername(userId, handle, user.name);
    setProfile(p);
    // Seed a snapshot immediately so new friends see something right away.
    try { await social.publishSnapshot(userId, buildSnapshot(state, p.display_name || user.name)); } catch { /* ignore */ }
    return p;
  }, [userId, user?.name, state]);

  const search = useCallback((handle) => social.findProfile(handle), []);

  const addFriend = useCallback(async (targetId) => {
    const res = await social.sendRequest(userId, targetId);
    await refresh();
    return res;
  }, [userId, refresh]);

  const accept = useCallback(async (friendshipId) => { await social.respondRequest(friendshipId, true); await refresh(); }, [refresh]);
  const decline = useCallback(async (friendshipId) => { await social.respondRequest(friendshipId, false); await refresh(); }, [refresh]);
  const remove = useCallback(async (friendshipId) => { await social.removeConnection(friendshipId); await refresh(); }, [refresh]);
  const setShare = useCallback(async (friendship, level) => { await social.setShareLevel(friendship, userId, level); await refresh(); }, [userId, refresh]);

  // ---- Derived buckets ----
  const { friends, incoming, outgoing } = useMemo(() => {
    const friends = [], incoming = [], outgoing = [];
    for (const f of links) {
      if (f.status === 'accepted') friends.push(f);
      else if (f.status === 'pending' && f.addressee === userId) incoming.push(f);
      else if (f.status === 'pending' && f.requester === userId) outgoing.push(f);
    }
    return { friends, incoming, outgoing };
  }, [links, userId]);

  return {
    enabled, loading, error, profile, userId,
    people, snaps, friends, incoming, outgoing,
    claim, search, addFriend, accept, decline, remove, setShare, refresh,
    myShareLevel: (f) => social.myShareLevel(f, userId),
    otherId: (f) => social.otherId(f, userId),
  };
}
