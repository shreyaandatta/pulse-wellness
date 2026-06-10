// Cloud accounts + data, layered over Supabase. Two responsibilities:
//   1. Auth — sign up / sign in / sign out with real email + password. Supabase
//      hashes passwords on its servers and issues a session token; we never see
//      or store the raw password.
//   2. Storage — each account's whole Pulse state is kept as a single JSONB blob
//      in the `wellness` table, one row per user. Row Level Security on the
//      server guarantees a user can only read/write their own row.
import { supabase } from './supabase.js';

// Turn a Supabase user/session into the small shape the rest of the app uses.
function toSession(user, session) {
  return {
    id: user.id,                                  // stable uuid → scopes storage
    name: user.user_metadata?.name || (user.email || '').split('@')[0],
    email: user.email,
    cloud: true,
    needsConfirm: !session,                        // email confirmation pending
  };
}

// Map Supabase's terse errors to warm, human messages.
function friendly(error) {
  const m = (error?.message || '').toLowerCase();
  if (m.includes('invalid login')) return new Error("That email or password doesn't match.");
  if (m.includes('already registered') || m.includes('already exists')) return new Error('An account with that email already exists. Try signing in.');
  if (m.includes('password')) return new Error('Use a password of at least 6 characters.');
  if (m.includes('email')) return new Error('Please enter a valid email address.');
  if (m.includes('failed to fetch') || m.includes('network')) return new Error('Could not reach the server. Check your connection.');
  return new Error(error?.message || 'Something went wrong. Please try again.');
}

export async function cloudSignUp(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() } },
  });
  if (error) throw friendly(error);
  return toSession(data.user, data.session);
}

export async function cloudSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw friendly(error);
  return toSession(data.user, data.session);
}

export async function cloudSignOut() {
  await supabase.auth.signOut();
}

// Restore an existing session on page load (Supabase persists it for us).
export async function getCloudSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return toSession(data.session.user, data.session);
}

// Fetch this user's saved state, or null if they've never synced before.
export async function loadCloudState(userId) {
  const { data, error } = await supabase
    .from('wellness')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

// Upsert the whole state blob. Last write wins — fine for a single user's
// personal journal across their own devices.
export async function saveCloudState(userId, state) {
  const { error } = await supabase
    .from('wellness')
    .upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() });
  if (error) throw error;
}
