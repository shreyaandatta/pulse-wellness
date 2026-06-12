# Push reminders — setup

Pulse can send a gentle daily reminder ("you haven't logged today — keep your
streak alive") even when the app is closed, using **Web Push**. This is built on
your existing Vercel + Supabase backend.

Reminders work for **cloud accounts only** (the server has to check whether
you've logged today — it can't see guest/on-device data). On **iPhone**, the user
must first **Add Pulse to the Home Screen**, then enable reminders from the
installed app — iOS doesn't allow web push from a normal Safari tab.

---

## What's already done (in code)

- Service worker shows the notification (`public/sw-push.js`, wired in via
  `vite.config.js`).
- Client subscribe / unsubscribe flow (`src/lib/push.js`) + the **Settings →
  Reminders** toggle.
- Server endpoints: `api/save-subscription.js`, `api/remove-subscription.js`,
  and the cron target `api/send-reminders.js` (`server/push.js` holds the shared
  logic). Daily cron is declared in `vercel.json`.
- Supabase table `push_subscriptions` (RLS-locked to each user) — **already
  created** on the live project.

## What you need to do (one time)

### 1. Generate the VAPID keys
Already done locally if `.env.local` has `VAPID_*` lines. If not:
```bash
npm run vapid
```
This writes the keys into `.env.local` (gitignored) and prints only the **public**
key. The private key never leaves that file — don't paste it anywhere public.

### 2. Add the env vars in Vercel
Project → Settings → Environment Variables. Copy the values straight from your
`.env.local`:

| Name | Where it's used | Value |
| --- | --- | --- |
| `VITE_VAPID_PUBLIC_KEY` | client (build) | the public key |
| `VAPID_PUBLIC_KEY` | server | the public key |
| `VAPID_PRIVATE_KEY` | server **(secret)** | the private key |
| `VAPID_SUBJECT` | server | `mailto:shreyaan.datta@gmail.com` |
| `CRON_SECRET` | server | any long random string you make up |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already set (used by billing).
`CRON_SECRET` protects the reminder endpoint — Vercel automatically sends it to
the cron, and nobody else can trigger sends without it.

### 3. Redeploy
Push to `main` (or redeploy) so the new env vars and `vercel.json` cron take
effect.

### 4. Check the cron
Vercel → your project → **Cron Jobs** should list `/api/send-reminders`. It runs
**once a day at 13:30 UTC = 7:00 PM IST** (edit the `schedule` in `vercel.json`
to change the time). On Vercel's free tier crons run once daily; on Pro you can
run it hourly and honour per-user times later.

---

## Testing

**Desktop Chrome:** open the live site → Settings → Reminders → toggle on → allow
notifications. Then trigger a send manually (only sends if you haven't logged
today):
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://pulsebysd.vercel.app/api/send-reminders
```
Response is `{ "checked": N, "sent": N, "removed": N }`. You should get a
notification.

**iPhone:** open `pulsebysd.vercel.app` in **Safari** → Share → **Add to Home
Screen** → open the installed Pulse → Settings → Reminders → toggle on → allow.
Then run the same curl (or wait for the daily cron).

> Note: a brand-new account with nothing logged yet counts as "not logged today",
> so it's a good way to test — log something and the reminder correctly stops.
