// The Family layer, over Supabase. Like social.js, this is a no-op surface for
// guests / on-device accounts — every call assumes a real cloud account.
//
// Model (see supabase/schema.sql):
//   • families         — a household; its creator is the first head.
//   • family_members   — (family, person) with a role ('head'|'kid') and a
//                        status ('pending'|'active'). Up to two heads, many kids.
//   • get_family_*()   — security-definer RPCs that read the roster, pending
//                        invites, and (for heads only) each member's curated
//                        daily snapshot with full detail.
//
// Members never expose their raw `wellness` row — heads read the same curated
// `shared_summary` everyone already publishes for Friends.
import { supabase } from './supabase.js';
import { findProfile } from './social.js';

// ---- Reads (RPCs) ----

// Flat roster rows for every family the caller is active in. The hook groups
// these by family_id.
export async function getOverview() {
  const { data, error } = await supabase.rpc('get_family_overview');
  if (error) throw error;
  return data || [];
}

export async function getInvites() {
  const { data, error } = await supabase.rpc('get_family_invites');
  if (error) throw error;
  return data || [];
}

// member_user_id -> snapshot row { summary, detail, updated_at }. Heads only;
// returns nothing for a member who isn't a head of any family.
export async function getSnapshots() {
  const { data, error } = await supabase.rpc('get_family_snapshots');
  if (error) throw error;
  const map = {};
  for (const row of data || []) map[row.member_user_id] = row;
  return map;
}

// ---- Mutations (plain table ops, gated by RLS) ----

// Create a family and seed the creator as its first active head. Returns the
// new family row.
export async function createFamily(userId, name) {
  const clean = (name || '').trim();
  if (clean.length < 1) throw new Error('Give your family a name.');
  if (clean.length > 40) throw new Error('Keep the family name under 40 characters.');
  const { data: fam, error } = await supabase
    .from('families').insert({ name: clean, created_by: userId })
    .select('id, name, created_by').single();
  if (error) throw error;
  const { error: mErr } = await supabase.from('family_members').insert({
    family_id: fam.id, user_id: userId, role: 'head', status: 'active', invited_by: userId,
  });
  if (mErr) throw mErr;
  return fam;
}

export async function renameFamily(familyId, name) {
  const clean = (name || '').trim();
  if (!clean) throw new Error('Family name can\'t be empty.');
  const { error } = await supabase.from('families').update({ name: clean }).eq('id', familyId);
  if (error) throw error;
}

export async function deleteFamily(familyId) {
  const { error } = await supabase.from('families').delete().eq('id', familyId);
  if (error) throw error;
}

// Invite a person by @handle as a 'kid' or 'head'. Returns 'invited' | 'exists'.
export async function inviteByHandle(familyId, handle, role, invitedBy) {
  const prof = await findProfile(handle);
  if (!prof) throw new Error(`No one found with the handle @${handle.replace(/^@/, '')}.`);
  const { error } = await supabase.from('family_members').insert({
    family_id: familyId, user_id: prof.id, role: role === 'head' ? 'head' : 'kid',
    status: 'pending', invited_by: invitedBy,
  });
  if (error) {
    if (error.code === '23505' || /duplicate|unique/i.test(error.message)) return 'exists';
    if (/at most two heads/i.test(error.message)) throw new Error('A family can have at most two heads.');
    throw error;
  }
  return 'invited';
}

// Accept your own pending invite (pending -> active).
export async function acceptInvite(memberId) {
  const { error } = await supabase.from('family_members')
    .update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', memberId);
  if (error) throw error;
}

// Decline an invite, or leave / be removed from a family — all a row delete.
export async function removeMember(memberId) {
  const { error } = await supabase.from('family_members').delete().eq('id', memberId);
  if (error) throw error;
}

// Promote a kid to head or demote a head to kid (trigger caps heads at two).
export async function setMemberRole(memberId, role) {
  const { error } = await supabase.from('family_members')
    .update({ role: role === 'head' ? 'head' : 'kid', updated_at: new Date().toISOString() })
    .eq('id', memberId);
  if (error) {
    if (/at most two heads/i.test(error.message)) throw new Error('A family can have at most two heads.');
    throw error;
  }
}
