// Server-authoritative Sparks wallet. The browser can only READ its wallet; this
// module (running with the service-role key, behind /api/sparks) is the one place
// a real balance, an owned item, or a verified purchase is ever written. Earns
// are recomputed here from the user's own synced data under a per-day cap, so a
// tampered client can't mint Sparks — at worst it shows a fake number that the
// next sync overwrites, and any purchase it can't truly afford is rejected.
import { adminDb } from './razorpay.js';
import {
  reconcileWallet, EARN_CAP_PER_DAY,
} from '../src/lib/economy.js';
import { normalizeWallet, DEFAULT_WALLET } from '../src/lib/storage.js';

// Read the authoritative wallet row (normalised to the full shape; defaults when
// the user has none yet). Never inserts — the row is created on first write.
export async function loadWallet(userId) {
  const { data, error } = await adminDb.from('wallets').select('data').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return normalizeWallet(data?.data || { ...DEFAULT_WALLET });
}

export async function saveWallet(userId, wallet) {
  const { error } = await adminDb
    .from('wallets')
    .upsert({ user_id: userId, data: wallet, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

// The user's synced state blob (days / goals / settings) — the data earns are
// computed from. Client-written, hence the per-day cap on repeatable earns.
export async function loadWellness(userId) {
  const { data } = await adminDb.from('wellness').select('data').eq('user_id', userId).maybeSingle();
  const s = data?.data || {};
  return { days: s.days || {}, goals: s.goals || {}, settings: s.settings || {} };
}

// True Plus status, straight from the server-authoritative entitlements table.
export async function isPlusUser(userId) {
  const { data } = await adminDb.from('entitlements').select('plus_until').eq('user_id', userId).maybeSingle();
  return !!(data?.plus_until && new Date(data.plus_until).getTime() > Date.now());
}

// Recompute earns for a wallet from the user's data (capped) and persist. Returns
// the fresh wallet. This is the heart of "the server owns the balance".
export async function syncEarns(userId, walletIn, plus) {
  const wellness = await loadWellness(userId);
  const state = { ...wellness, wallet: walletIn };
  const { wallet, credited } = reconcileWallet(state, plus, { cap: EARN_CAP_PER_DAY });
  if (credited > 0) await saveWallet(userId, wallet);
  return wallet;
}
