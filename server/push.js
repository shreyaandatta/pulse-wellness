// Shared server-side helpers for Web-Push reminders. Imported only by the
// serverless functions in /api — never by the browser bundle — so the VAPID
// private key and service-role key are safe to read here.
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET,
} = process.env;

// Everything needed to actually send a push must be present; endpoints return a
// clear 503 otherwise and the client keeps reminders switched off.
export const pushConfigured = Boolean(
  VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
);

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:hello@pulse.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Service-role client — bypasses RLS so the cron can read every enabled
// subscription and each user's wellness blob.
export const adminDb = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

export { CRON_SECRET };

// ---- request helpers (mirrors server/razorpay.js) -------------------------

export async function getUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !adminDb) return null;
  try {
    const { data, error } = await adminDb.auth.getUser(token);
    if (error) return null;
    return data.user || null;
  } catch { return null; }
}

export async function getJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let raw = '';
  if (typeof req.body === 'string') raw = req.body;
  else { const chunks = []; for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c); raw = Buffer.concat(chunks).toString('utf8'); }
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

// ---- date / streak helpers (timezone-aware) -------------------------------

// Today's YYYY-MM-DD as seen in the user's timezone.
export function todayKey(tz) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
}

// The day key `n` calendar days before `key` (pure calendar math, tz-safe
// because we anchor the key at noon UTC and only shift whole days).
function shiftKey(key, n) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Did this day record anything at all?
function hasAnyLog(d) {
  if (!d) return false;
  return (d.water > 0) || (Array.isArray(d.meals) && d.meals.length > 0) ||
    (d.sleep != null) || (d.mood != null) || (d.steps > 0) ||
    (Array.isArray(d.workouts) && d.workouts.length > 0) ||
    (d.custom && Object.keys(d.custom).length > 0);
}

export function isLoggedToday(blob, tz) {
  return hasAnyLog(blob?.days?.[todayKey(tz)]);
}

// Consecutive logged days ending yesterday — i.e. the streak that today's
// missing entry would break. Caps the look-back so we never loop forever.
export function streakAtRisk(blob, tz) {
  const days = blob?.days || {};
  let count = 0;
  let key = shiftKey(todayKey(tz), -1);
  for (let i = 0; i < 400; i++) {
    if (hasAnyLog(days[key])) { count++; key = shiftKey(key, -1); }
    else break;
  }
  return count;
}

// ---- push send ------------------------------------------------------------

// Returns { ok } or { ok:false, expired } so the caller can prune dead endpoints.
export async function sendPush(sub, payload) {
  const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    const code = e?.statusCode;
    return { ok: false, expired: code === 404 || code === 410, code };
  }
}
