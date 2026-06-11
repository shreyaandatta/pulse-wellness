// The friends / connections layer, over Supabase. Everything here assumes a
// real cloud account (it's a no-op surface for guests / on-device accounts).
//
// Privacy model, in short:
//   • profiles      — your shareable @handle, so people can find you.
//   • friendships   — a request that becomes a two-way link once accepted; each
//                     side independently picks how much they share (summary/detail).
//   • shared_summary — the curated snapshot a friend is allowed to read. The raw
//                     `wellness` row is never exposed; friends only ever see this.
import { supabase, hasSupabase } from './supabase.js';

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

// Normalise a typed handle ("@Shreyaan " → "shreyaan").
export function normHandle(h) {
  return (h || '').trim().replace(/^@/, '').toLowerCase();
}

export function handleError(h) {
  const v = normHandle(h);
  if (v.length < 3) return 'Handles need at least 3 characters.';
  if (v.length > 20) return 'Handles can be at most 20 characters.';
  if (!HANDLE_RE.test(v)) return 'Use only letters, numbers and underscores.';
  return null;
}

// ---- Profile ----

export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles').select('id, username, display_name').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function claimUsername(userId, handle, displayName) {
  const username = normHandle(handle);
  const bad = handleError(username);
  if (bad) throw new Error(bad);
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, username, display_name: displayName || null })
    .select('id, username, display_name').single();
  if (error) {
    if ((error.code === '23505') || /duplicate|unique/i.test(error.message)) {
      throw new Error(`@${username} is already taken — try another.`);
    }
    throw error;
  }
  return data;
}

// Exact-handle lookup via the security-definer function (no user enumeration).
export async function findProfile(handle) {
  const username = normHandle(handle);
  if (handleError(username)) return null;
  const { data, error } = await supabase.rpc('find_profile', { handle: username });
  if (error) throw error;
  return (data && data[0]) || null;
}

// ---- Friendships ----

export async function listFriendships(userId) {
  const { data, error } = await supabase
    .from('friendships').select('*')
    .or(`requester.eq.${userId},addressee.eq.${userId}`);
  if (error) throw error;
  return data || [];
}

export async function getProfilesByIds(ids) {
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from('profiles').select('id, username, display_name').in('id', ids);
  if (error) throw error;
  const map = {};
  for (const p of data || []) map[p.id] = p;
  return map;
}

// Send a request to a user id. If they already requested us, accept instead.
// Returns 'sent' | 'accepted' | 'exists'.
export async function sendRequest(myId, targetId) {
  const links = await listFriendships(myId);
  const existing = links.find(
    (f) => (f.requester === targetId && f.addressee === myId) ||
           (f.requester === myId && f.addressee === targetId)
  );
  if (existing) {
    if (existing.status === 'accepted') return 'exists';
    // They already asked us → just accept it.
    if (existing.addressee === myId && existing.status === 'pending') {
      await respondRequest(existing.id, true);
      return 'accepted';
    }
    if (existing.status === 'declined') {
      // Revive a previously declined/own request.
      await supabase.from('friendships')
        .update({ status: 'pending', requester: myId, addressee: targetId, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return 'sent';
    }
    return 'exists';
  }
  const { error } = await supabase
    .from('friendships').insert({ requester: myId, addressee: targetId });
  if (error) throw error;
  return 'sent';
}

export async function respondRequest(friendshipId, accept) {
  const { error } = await supabase.from('friendships')
    .update({ status: accept ? 'accepted' : 'declined', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw error;
}

export async function removeConnection(friendshipId) {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}

// Set how much *I* share with the other side of a given friendship row.
export async function setShareLevel(friendship, myId, level) {
  const col = friendship.requester === myId ? 'requester_share' : 'addressee_share';
  const { error } = await supabase.from('friendships')
    .update({ [col]: level, updated_at: new Date().toISOString() })
    .eq('id', friendship.id);
  if (error) throw error;
}

// What level is currently applied to a friend (my side of the link)?
export function myShareLevel(friendship, myId) {
  return friendship.requester === myId ? friendship.requester_share : friendship.addressee_share;
}

// The other party's user id on a friendship row.
export function otherId(friendship, myId) {
  return friendship.requester === myId ? friendship.addressee : friendship.requester;
}

// ---- Snapshots ----

// Read every accepted friend's snapshot (server gates detail by their choice).
export async function getFriendSnapshots() {
  const { data, error } = await supabase.rpc('get_friend_snapshots');
  if (error) throw error;
  const map = {};
  for (const row of data || []) map[row.friend_id] = row;
  return map;
}

export async function publishSnapshot(userId, snap) {
  const { error } = await supabase.from('shared_summary').upsert({
    user_id: userId,
    summary: snap.summary,
    detail: snap.detail,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export { hasSupabase };
