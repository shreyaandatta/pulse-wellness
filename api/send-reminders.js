// GET/POST /api/send-reminders  — invoked by Vercel Cron (see vercel.json).
//
// Walks every enabled push subscription and, for users who haven't logged
// anything today, sends a gentle reminder. Idempotent per day via last_sent_date,
// so re-running it won't double-notify. Protected by CRON_SECRET.
import { adminDb, json, pushConfigured, CRON_SECRET, todayKey, isLoggedToday, streakAtRisk, sendPush } from '../server/push.js';

function buildMessage(blob, tz) {
  const streak = streakAtRisk(blob, tz);
  if (streak >= 2) {
    return { title: `🔥 Keep your ${streak}-day streak alive`, body: "You haven't logged today yet — a few taps keeps it going.", tag: 'pulse-streak', url: '/' };
  }
  return { title: '🌙 How did today go?', body: 'Take a few seconds to log your day in Pulse.', tag: 'pulse-reminder', url: '/' };
}

export default async function handler(req, res) {
  if (!pushConfigured) return json(res, 503, { error: 'Reminders are not configured yet.' });
  if (!CRON_SECRET) return json(res, 500, { error: 'CRON_SECRET is not set.' });

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  const header = req.headers.authorization || '';
  if (header !== `Bearer ${CRON_SECRET}`) return json(res, 401, { error: 'Unauthorized' });

  // All opted-in subscriptions.
  const { data: subs, error } = await adminDb
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, tz, last_sent_date')
    .eq('enabled', true);
  if (error) { console.error('send-reminders load failed:', error.message); return json(res, 500, { error: 'Load failed.' }); }
  if (!subs?.length) return json(res, 200, { checked: 0, sent: 0, removed: 0 });

  // Fetch the wellness blob for each distinct user in one query.
  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const { data: rows } = await adminDb.from('wellness').select('user_id, data').in('user_id', userIds);
  const blobByUser = new Map((rows || []).map((r) => [r.user_id, r.data]));

  let sent = 0, removed = 0;
  for (const sub of subs) {
    const tz = sub.tz || 'Asia/Kolkata';
    const today = todayKey(tz);
    if (sub.last_sent_date === today) continue;          // already nudged today

    const blob = blobByUser.get(sub.user_id);
    if (isLoggedToday(blob, tz)) continue;               // they've already shown up

    const result = await sendPush(sub, buildMessage(blob, tz));
    if (result.ok) {
      sent++;
      await adminDb.from('push_subscriptions').update({ last_sent_date: today }).eq('id', sub.id);
    } else if (result.expired) {
      removed++;
      await adminDb.from('push_subscriptions').delete().eq('id', sub.id);
    }
  }

  return json(res, 200, { checked: subs.length, sent, removed });
}
