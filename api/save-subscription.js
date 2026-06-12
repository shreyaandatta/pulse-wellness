// POST /api/save-subscription
// Body: { subscription: PushSubscription, tz: string }
// Auth: Supabase access token in the Authorization header.
//
// Stores (or refreshes) this device's push subscription so the reminder cron
// can reach it. Keyed by endpoint, so re-subscribing the same device updates it.
import { adminDb, getUser, getJson, json, pushConfigured } from '../server/push.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!pushConfigured) return json(res, 503, { error: 'Reminders are not configured yet.' });

  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'Please sign in to enable reminders.' });

  const { subscription, tz } = await getJson(req);
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) return json(res, 400, { error: 'Invalid subscription.' });

  const { error } = await adminDb.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint,
    p256dh,
    auth,
    tz: typeof tz === 'string' ? tz.slice(0, 64) : null,
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (error) {
    console.error('save-subscription failed:', error.message);
    return json(res, 500, { error: 'Could not save your reminder settings.' });
  }
  return json(res, 200, { ok: true });
}
