// POST /api/razorpay-webhook
// Razorpay calls this on every subscription event. We verify the signature, then
// update the user's entitlement. This — not the browser — is the source of truth
// for who has Plus, so it can't be faked client-side.
import { adminDb, getRawBody, verifySignature, json, WEBHOOK_SECRET } from '../server/razorpay.js';

// Vercel must not pre-parse the body: we need the exact bytes Razorpay signed.
export const config = { api: { bodyParser: false } };

// Events that mean "Plus is paid and current" vs "this subscription is over".
const ACTIVE = new Set(['subscription.activated', 'subscription.charged', 'subscription.resumed', 'subscription.authenticated']);
const ENDED = new Set(['subscription.cancelled', 'subscription.completed', 'subscription.expired']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const raw = await getRawBody(req);
  const signature = req.headers['x-razorpay-signature'];
  if (!verifySignature(raw, signature, WEBHOOK_SECRET)) {
    return json(res, 400, { error: 'Invalid signature' });
  }

  let event;
  try { event = JSON.parse(raw); } catch { return json(res, 400, { error: 'Bad JSON' }); }

  const sub = event?.payload?.subscription?.entity;
  if (!sub) return json(res, 200, { ok: true, ignored: event?.event });

  const userId = sub.notes?.user_id;
  // current_end is a unix timestamp (seconds) for the end of the paid period.
  const plusUntil = sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null;
  const active = ACTIVE.has(event.event);
  const ended = ENDED.has(event.event);

  // Plus stays on while we're inside a paid period. A cancel "at cycle end" keeps
  // the user Plus until current_end passes; only then does the period lapse.
  const stillPaid = plusUntil ? new Date(plusUntil) > new Date() : active;
  const plan = (active || (ended && stillPaid)) ? 'plus' : 'free';

  const row = {
    rzp_subscription_id: sub.id,
    rzp_customer_id: sub.customer_id || null,
    status: ended ? event.event.replace('subscription.', '') : (sub.status || event.event),
    plan,
    updated_at: new Date().toISOString(),
  };
  if (plusUntil) row.plus_until = plusUntil;

  try {
    // Prefer matching the row we created at checkout; fall back to user_id from
    // the subscription notes if the webhook somehow arrives first.
    const { data: updated, error } = await adminDb
      .from('entitlements').update(row).eq('rzp_subscription_id', sub.id).select('user_id');
    if (error) throw error;
    if ((!updated || updated.length === 0) && userId) {
      await adminDb.from('entitlements').upsert(
        { user_id: userId, ...row }, { onConflict: 'user_id' });
    }
  } catch (e) {
    console.error('webhook db write failed:', e?.message || e);
    return json(res, 500, { error: 'db error' });
  }

  return json(res, 200, { ok: true });
}
