// The Challenges layer, over Supabase. Like family.js / social.js, this is inert
// for guests / on-device accounts — every call assumes a real cloud account.
//
// Model (see supabase/schema.sql):
//   • challenges          — a time-boxed shared goal (metric + optional daily
//                           target + start/end). Its creator owns it.
//   • challenge_members   — (challenge, person) with status 'invited'|'active'.
//   • challenge_progress  — each member's OWN per-day row (value + whether that
//                           day's goal was hit). Clients write only their own
//                           rows; the leaderboard aggregates them.
//   • get_challenge_*()   — security-definer RPCs for my challenges, my invites,
//                           and a challenge's standings.
//
// Snapshots are today-only, so a multi-day leaderboard is built from these daily
// progress rows — never from the raw wellness row, which stays private.
import { supabase } from './supabase.js';
import { findProfile } from './social.js';
import { todayKey, addDays } from './dates.js';
import { getDay } from './storage.js';
import { dayScore, goalsHit } from './score.js';

// The metrics a challenge can rank on. `defaultGoal` seeds the daily-target
// field; `value` reads today's number from a day + goals.
export const CH_METRICS = {
  steps:  { label: 'Steps',         emoji: '👟', unit: '',    defaultGoal: 10000, fmt: (v) => Math.round(v).toLocaleString() },
  active: { label: 'Active minutes', emoji: '🔥', unit: 'min', defaultGoal: 30,    fmt: (v) => `${Math.round(v)}` },
  score:  { label: 'Wellness score', emoji: '🌟', unit: '',    defaultGoal: 80,    fmt: (v) => `${Math.round(v)}` },
  goals:  { label: 'Goals hit',      emoji: '🎯', unit: '/5',  defaultGoal: 5,     fmt: (v) => `${Math.round(v)}` },
};

export const DURATIONS = [
  { days: 3,  label: '3 days' },
  { days: 7,  label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '30 days' },
];

// Today's value for a metric, from the user's own day + goals.
export function challengeValue(metric, day, goals) {
  switch (metric) {
    case 'steps':  return day.steps || 0;
    case 'active': return (day.workouts || []).reduce((s, w) => s + (w.minutes || 0), 0);
    case 'score':  return dayScore(day, goals);
    case 'goals':  return goalsHit(day, goals).hit;
    default:       return 0;
  }
}

// What this user contributes to a challenge today: { value, hit }.
export function todayProgress(metric, goal, state) {
  const day = getDay(state, todayKey());
  const value = challengeValue(metric, day, state.goals);
  const hit = goal != null ? value >= goal : false;
  return { value, hit };
}

// ---- Reads (RPCs) ----
export async function getMyChallenges() {
  const { data, error } = await supabase.rpc('get_my_challenges');
  if (error) throw error;
  return data || [];
}

export async function getInvites() {
  const { data, error } = await supabase.rpc('get_challenge_invites');
  if (error) throw error;
  return data || [];
}

export async function getStandings(challengeId) {
  const { data, error } = await supabase.rpc('get_challenge_standings', { cid: challengeId });
  if (error) throw error;
  return data || [];
}

// ---- Mutations (plain table ops, gated by RLS) ----

// Create a challenge and seed the creator as its first active member.
export async function createChallenge(userId, { title, metric, goal, days }) {
  const clean = (title || '').trim();
  if (clean.length < 1) throw new Error('Give your challenge a name.');
  if (clean.length > 50) throw new Error('Keep the name under 50 characters.');
  if (!CH_METRICS[metric]) throw new Error('Pick something to track.');
  const starts = todayKey();
  const ends = addDays(starts, Math.max(1, days) - 1);
  const { data: ch, error } = await supabase
    .from('challenges')
    .insert({ title: clean, metric, goal: goal != null && goal !== '' ? Number(goal) : null, starts, ends, created_by: userId })
    .select('id, title, metric, goal, starts, ends, created_by').single();
  if (error) throw error;
  const { error: mErr } = await supabase.from('challenge_members')
    .insert({ challenge_id: ch.id, user_id: userId, status: 'active', invited_by: userId });
  if (mErr) throw mErr;
  return ch;
}

// Invite a person by @handle. Returns 'invited' | 'exists'.
export async function inviteByHandle(challengeId, handle, invitedBy) {
  const prof = await findProfile(handle);
  if (!prof) throw new Error(`No one found with the handle @${handle.replace(/^@/, '')}.`);
  const { error } = await supabase.from('challenge_members')
    .insert({ challenge_id: challengeId, user_id: prof.id, status: 'invited', invited_by: invitedBy });
  if (error) {
    if (error.code === '23505' || /duplicate|unique/i.test(error.message)) return 'exists';
    throw error;
  }
  return 'invited';
}

export async function acceptInvite(memberId) {
  const { error } = await supabase.from('challenge_members')
    .update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', memberId);
  if (error) throw error;
}

// Decline an invite, or leave / be removed — all a row delete.
export async function removeMember(memberId) {
  const { error } = await supabase.from('challenge_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function deleteChallenge(challengeId) {
  const { error } = await supabase.from('challenges').delete().eq('id', challengeId);
  if (error) throw error;
}

// Leave a challenge I'm in (deletes my own member row; RLS allows self-delete).
export async function leaveChallenge(challengeId, userId) {
  const { error } = await supabase.from('challenge_members').delete()
    .eq('challenge_id', challengeId).eq('user_id', userId);
  if (error) throw error;
}

// Upsert my own progress for a day (one row per challenge/user/day).
export async function publishProgress(challengeId, userId, day, value, hit) {
  const { error } = await supabase.from('challenge_progress')
    .upsert({ challenge_id: challengeId, user_id: userId, day, value, hit, updated_at: new Date().toISOString() },
      { onConflict: 'challenge_id,user_id,day' });
  if (error) throw error;
}
