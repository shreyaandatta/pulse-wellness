// POST /api/cancel-subscription
// Auth: Supabase access token in the Authorization header.
//
// Cancels the signed-in user's subscription *at the end of the current cycle*,
// so they keep Plus for the time they've already paid for. The webhook then
// flips them to free once the period actually ends.
import { razorpay, adminDb, getUser, json, billingConfigured } from '../server/razorpay.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!billingConfigured) return json(res, 503, { error: 'Billing is not configured yet.' });

  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'Please sign in.' });

  const { data: ent, error } = await adminDb
    .from('entitlements').select('rzp_subscription_id').eq('user_id', user.id).maybeSingle();
  if (error || !ent?.rzp_subscription_id) return json(res, 404, { error: 'No active subscription found.' });

  try {
    // cancel_at_cycle_end = 1 → keep access until the paid period ends.
    await razorpay.subscriptions.cancel(ent.rzp_subscription_id, { cancel_at_cycle_end: 1 });
    await adminDb.from('entitlements')
      .update({ status: 'cancelling', updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('cancel-subscription failed:', e?.error || e?.message || e);
    return json(res, 502, { error: 'Could not cancel right now. Please try again.' });
  }
}
