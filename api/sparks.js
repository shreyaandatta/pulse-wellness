// POST /api/sparks  — the one write path for the Sparks wallet.
// Body: { action: 'sync' | 'buy' | 'equip' | 'freeze', ...args }
// Auth: Supabase access token in the Authorization header.
//
// Every action first recomputes earns server-side (capped), then applies the
// requested change against the *authoritative* wallet and re-validates it, so a
// tampered client can't buy what it can't afford, equip what it doesn't own,
// claim Plus skins without Plus, or over-freeze. Returns the fresh wallet.
import { getUser, getJson, json } from '../server/razorpay.js';
import { loadWallet, saveWallet, isPlusUser, syncEarns } from '../server/sparks.js';
import { SHOP_INDEX, purchaseItem, equipCosmetic, freezeDay, findCosmetic } from '../src/lib/economy.js';

const BUY_ERR = {
  funds: 'Not enough Sparks.', plus: 'That one needs Plus.',
  owned: 'You already own that.', full: 'Your freezes are full.', invalid: 'Unknown item.',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'Please sign in to use Sparks.' });

  const body = await getJson(req);
  const action = body.action;

  try {
    const plus = await isPlusUser(user.id);
    // Reconcile earns first so the balance every action sees is current.
    const wallet = await syncEarns(user.id, await loadWallet(user.id), plus);

    if (action === 'sync') return json(res, 200, { wallet });

    if (action === 'buy') {
      const item = SHOP_INDEX[body.itemId];
      if (!item) return json(res, 400, { error: BUY_ERR.invalid });
      const r = purchaseItem(wallet, item, { plus });
      if (!r.ok) return json(res, 400, { error: BUY_ERR[r.reason] || 'Could not complete.', wallet });
      await saveWallet(user.id, r.wallet);
      return json(res, 200, { wallet: r.wallet });
    }

    if (action === 'equip') {
      const item = findCosmetic(body.slot, body.value);
      if (!item) return json(res, 400, { error: BUY_ERR.invalid });
      const r = equipCosmetic(wallet, item);
      if (!r.ok) return json(res, 400, { error: 'You don’t own that yet.', wallet });
      await saveWallet(user.id, r.wallet);
      return json(res, 200, { wallet: r.wallet });
    }

    if (action === 'freeze') {
      const r = freezeDay(wallet, body.day);
      if (!r.ok) return json(res, 400, { error: r.reason === 'dup' ? 'That day is already protected.' : 'No freezes left.', wallet });
      await saveWallet(user.id, r.wallet);
      return json(res, 200, { wallet: r.wallet });
    }

    return json(res, 400, { error: 'Unknown action.' });
  } catch (e) {
    console.error('sparks action failed:', e?.message || e);
    return json(res, 500, { error: 'Something went wrong. Please try again.' });
  }
}
