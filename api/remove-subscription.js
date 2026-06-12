// POST /api/remove-subscription
// Body: { endpoint: string }
// Auth: Supabase access token in the Authorization header.
//
// Deletes this device's push subscription when the user turns reminders off.
import { adminDb, getUser, getJson, json, pushConfigured } from '../server/push.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!pushConfigured) return json(res, 503, { error: 'Reminders are not configured yet.' });

  const user = await getUser(req);
  if (!user) return json(res, 401, { error: 'Please sign in.' });

  const { endpoint } = await getJson(req);
  if (!endpoint) return json(res, 400, { error: 'Missing endpoint.' });

  // Scope the delete to this user even though the service role could ignore RLS.
  const { error } = await adminDb
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('remove-subscription failed:', error.message);
    return json(res, 500, { error: 'Could not update your reminder settings.' });
  }
  return json(res, 200, { ok: true });
}
