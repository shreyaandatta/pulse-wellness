// POST /api/create-spark-order
// Body: { pack: 'pack-s' | 'pack-m' | 'pack-l' | 'pack-xl' }
// Auth: Supabase access token in the Authorization header.
//
// Creates a one-time Razorpay Order for a Spark pack and returns the order id +
// amount + public key id so the browser can open Checkout. The price comes from
// the server-side table — the browser only names a pack. No secret leaves here.
import { razorpay, getUser, getJson, json, KEY_ID, SPARK_PACKS, billingConfigured } from '../server/razorpay.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!billingConfigured) return json(res, 503, { error: 'Payments are not configured yet.' });

  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'Please sign in to buy Sparks.' });

  const { pack } = await getJson(req);
  const def = SPARK_PACKS[pack];
  if (!def) return json(res, 400, { error: 'Unknown pack.' });

  try {
    const order = await razorpay.orders.create({
      amount: def.amount,            // paise — authoritative, from the server table
      currency: 'INR',
      receipt: `sparks_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: user.id, pack, sparks: String(def.sparks) },
    });
    return json(res, 200, { orderId: order.id, amount: def.amount, currency: 'INR', keyId: KEY_ID });
  } catch (e) {
    console.error('create-spark-order failed:', e?.error || e?.message || e);
    return json(res, 502, { error: 'Could not start checkout. Please try again.' });
  }
}
