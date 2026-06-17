// POST /api/verify-spark-order
// Body: { pack, orderId, paymentId, signature }
// Auth: Supabase access token in the Authorization header.
//
// Confirms the Razorpay payment signature is genuine, then credits the Sparks
// to the user's *server-authoritative* wallet (deduped by payment id) and returns
// the fresh wallet. The signature check is what stops crediting without paying;
// crediting on the server (not the client) is what stops a tampered client from
// granting itself a pack it never bought.
import { getUser, getJson, json, SPARK_PACKS, verifyOrderPayment, billingConfigured } from '../server/razorpay.js';
import { loadWallet, saveWallet, isPlusUser, syncEarns } from '../server/sparks.js';
import { creditPurchase } from '../src/lib/economy.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!billingConfigured) return json(res, 503, { error: 'Payments are not configured yet.' });

  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'Please sign in.' });

  const { pack, orderId, paymentId, signature } = await getJson(req);
  const def = SPARK_PACKS[pack];
  if (!def) return json(res, 400, { error: 'Unknown pack.' });

  if (!verifyOrderPayment(orderId, paymentId, signature)) {
    return json(res, 400, { error: 'Payment could not be verified.' });
  }

  try {
    const plus = await isPlusUser(user.id);
    const wallet = await syncEarns(user.id, await loadWallet(user.id), plus);
    const r = creditPurchase(wallet, def.sparks, paymentId);
    if (r.ok) await saveWallet(user.id, r.wallet);   // not ok => this payment was already credited
    return json(res, 200, { ok: true, sparks: def.sparks, wallet: r.wallet });
  } catch (e) {
    console.error('verify-spark-order credit failed:', e?.message || e);
    return json(res, 500, { error: 'Payment verified but crediting failed — reopen the Shop to refresh.' });
  }
}
