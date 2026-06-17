// POST /api/verify-spark-order
// Body: { pack, orderId, paymentId, signature }
// Auth: Supabase access token in the Authorization header.
//
// Confirms the Razorpay payment signature is genuine, then tells the browser how
// many Sparks the pack is worth. The Sparks balance itself is client-side state
// (local-first, synced in the user's own data blob), so the client credits the
// wallet on this verified response and dedupes by payment id. Sparks only buy
// in-app cosmetics — they have no cash value or resale — so a server ledger
// isn't warranted; the signature check is what stops crediting without paying.
import { getUser, getJson, json, SPARK_PACKS, verifyOrderPayment, billingConfigured } from '../server/razorpay.js';

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

  return json(res, 200, { ok: true, sparks: def.sparks, paymentId });
}
