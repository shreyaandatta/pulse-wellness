import { useState, useEffect, useCallback, useMemo } from 'react';
import { hasSupabase } from '../lib/supabase.js';
import * as family from '../lib/family.js';

// Owns the Family experience for a cloud account: the household(s) you're in,
// the roster + roles, pending invites, and — if you're a head — each member's
// curated daily snapshot (so a parent sees their kid's steps, calories, protein,
// workouts and mood).
//
// Members publish their snapshot through useSocial's existing publish effect, so
// there's nothing to push here; this hook is read + manage only. Fully inert for
// guests / on-device accounts.
export function useFamily({ user }) {
  const enabled = hasSupabase && !!user?.cloud && !user?.guest;
  const userId = enabled ? user.id : null;

  const [rows, setRows] = useState([]);       // flat get_family_overview rows
  const [invites, setInvites] = useState([]); // pending invites to me
  const [snaps, setSnaps] = useState({});     // member_user_id -> snapshot row
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [overview, inv, snapMap] = await Promise.all([
        family.getOverview(),
        family.getInvites(),
        family.getSnapshots(),
      ]);
      setRows(overview);
      setInvites(inv);
      setSnaps(snapMap);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load your family.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load + a light poll so a member's fresh check-in and new invites
  // appear without a manual refresh.
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    refresh();
    const id = setInterval(refresh, 30000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [enabled, refresh]);

  // Group the flat roster rows into a single family (a person is in at most one
  // household in this version) with its members, and figure out my own role.
  const { fam, members, amHead, myMember } = useMemo(() => {
    if (!rows.length) return { fam: null, members: [], amHead: false, myMember: null };
    const first = rows[0];
    const fam = { id: first.family_id, name: first.family_name, created_by: first.created_by };
    const members = rows
      .filter((r) => r.family_id === fam.id)
      .map((r) => ({
        id: r.member_id,            // family_members row id (for manage/leave)
        memberUserId: r.member_user_id,
        role: r.role,
        status: r.status,
        username: r.username,
        displayName: r.display_name,
        isMe: r.member_user_id === userId,
      }));
    const me = members.find((m) => m.isMe) || null;
    return { fam, members, amHead: me?.role === 'head', myMember: me };
  }, [rows, userId]);

  const heads = useMemo(() => members.filter((m) => m.role === 'head'), [members]);
  const kids = useMemo(() => members.filter((m) => m.role === 'kid'), [members]);

  // ---- Actions (each refreshes so the UI reflects the new state) ----
  const create = useCallback(async (name) => { const f = await family.createFamily(userId, name); await refresh(); return f; }, [userId, refresh]);
  const rename = useCallback(async (name) => { await family.renameFamily(fam.id, name); await refresh(); }, [fam, refresh]);
  const disband = useCallback(async () => { await family.deleteFamily(fam.id); await refresh(); }, [fam, refresh]);
  const invite = useCallback(async (handle, role) => { const r = await family.inviteByHandle(fam.id, handle, role, userId); await refresh(); return r; }, [fam, userId, refresh]);
  const accept = useCallback(async (memberId) => { await family.acceptInvite(memberId); await refresh(); }, [refresh]);
  const decline = useCallback(async (memberId) => { await family.removeMember(memberId); await refresh(); }, [refresh]);
  const remove = useCallback(async (memberRowId) => { await family.removeMember(memberRowId); await refresh(); }, [refresh]);
  const leave = useCallback(async () => { if (myMember?.id) { await family.removeMember(myMember.id); await refresh(); } }, [myMember, refresh]);
  const setRole = useCallback(async (memberRowId, role) => { await family.setMemberRole(memberRowId, role); await refresh(); }, [refresh]);

  return {
    enabled, loading, error, userId,
    family: fam, members, heads, kids, amHead, myMember, snaps, invites,
    create, rename, disband, invite, accept, decline, remove, leave, setRole, refresh,
  };
}
