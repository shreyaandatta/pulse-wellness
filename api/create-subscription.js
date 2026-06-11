// POST /api/create-subscription
// Body: { plan: 'monthly' | 'yearly' }
// Auth: Supabase access token in the Authorization header.
//
// Creates a Razorpay subscription for the signed-in user and records a pending
// entitlement row. Returns the subscription id + public key id so the browser
// can open Razorpay Checkout. The browser never sees a secret.
import { razorpay, adminDb, getUser, getJson, json, KEY_ID, PLAN_IDS, billingConfigured } from '../server/razorpay.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!billingConfigured) return json(res, 503, { error: 'Billing is not configured yet.' });

  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'Please sign in to upgrade.' });

  const { plan } = await getJson(req);
  const planId = PLAN_IDS[plan];
  if (!planId) return json(res, 400, { error: 'Unknown plan.' });

  // total_count caps how many cycles can auto-renew before the mandate ends.
  // Generous so it behaves like "until cancelled": ~10 years either way.
  const totalCount = plan === 'yearly' ? 10 : 120;

  try {
    const sub = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      customer_notify: 1,
      notes: { user_id: user.id, email: user.email || '' },
    });

    // Record the pending subscription so the webhook can match it back to the
    // user even if it fires before the browser confirms.
    await adminDb.from('entitlements').upsert({
      user_id: user.id,
      rzp_subscription_id: sub.id,
      status: sub.status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return json(res, 200, { subscriptionId: sub.id, keyId: KEY_ID });
  } catch (e) {
    console.error('create-subscription failed:', e?.error || e?.message || e);
    return json(res, 502, { error: 'Could not start checkout. Please try again.' });
  }
}
