// Client side of Web-Push reminders. Talks only to our own /api functions and
// the browser's Push API — never touches the VAPID private key. Stays inert
// (reminders simply can't be enabled) unless VITE_VAPID_PUBLIC_KEY is set.
import { supabase } from './supabase.js';

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// True only when this browser can actually do Web-Push AND we have a key to use.
export const pushSupported = typeof window !== 'undefined' &&
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const pushConfigured = Boolean(VAPID_PUBLIC);

// VAPID public keys are base64url; the subscribe call wants a Uint8Array.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Current permission: 'default' (unasked), 'granted', or 'denied'.
export function permission() {
  return pushSupported ? Notification.permission : 'denied';
}

// Is this device already subscribed?
export async function currentSubscription() {
  if (!pushSupported) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function isEnabled() {
  return Boolean(await currentSubscription());
}

async function authedPost(path, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Please sign in to manage reminders.');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json;
}

// Ask permission (if needed), subscribe this device, and register it server-side.
// Returns true on success; throws a friendly error otherwise.
export async function enableReminders() {
  if (!pushSupported) throw new Error('This browser doesn’t support notifications.');
  if (!pushConfigured) throw new Error('Reminders aren’t configured on this build yet.');

  const perm = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error(perm === 'denied'
      ? 'Notifications are blocked. Enable them for Pulse in your browser settings.'
      : 'Reminders need notification permission.');
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  await authedPost('/api/save-subscription', { subscription: sub.toJSON(), tz });
  return true;
}

// Unsubscribe this device and forget it server-side.
export async function disableReminders() {
  const sub = await currentSubscription();
  if (!sub) return true;
  const endpoint = sub.endpoint;
  try { await sub.unsubscribe(); } catch { /* keep going — still remove server-side */ }
  try { await authedPost('/api/remove-subscription', { endpoint }); } catch { /* best effort */ }
  return true;
}
