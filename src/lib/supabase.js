// Optional cloud backend. Pulse stays 100% local *unless* these two keys are
// present at build time — then it upgrades to real accounts + cross-device
// sync via Supabase. The anon key is meant to be public; your data is protected
// by Row Level Security on the server (each user can only touch their own row).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// True only when both keys are configured. Everything branches on this so the
// app runs identically (on-device accounts) when Supabase isn't set up.
export const hasSupabase = Boolean(url && anon);

export const supabase = hasSupabase ? createClient(url, anon) : null;
