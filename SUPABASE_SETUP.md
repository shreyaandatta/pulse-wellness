# Turning on cloud accounts (Supabase) — step by step

Pulse works fully **without** this. Following these steps upgrades it to **real
accounts with email + password that sync across all your devices.** No coding —
just clicking and copy-pasting. Takes about 10 minutes.

> While the keys aren't set, Pulse keeps using on-device accounts and nothing
> breaks. The switch is automatic the moment the keys are in place.

---

## 1. Create a free Supabase project

1. Go to **[supabase.com](https://supabase.com)** and click **Start your project** → sign in with GitHub.
2. Click **New project**.
3. Give it a name (e.g. `pulse`), set a **database password** (save it somewhere — you won't need it for Pulse, but Supabase wants one), pick the region closest to you, and click **Create new project**.
4. Wait ~2 minutes while it sets up.

## 2. Create the data table

1. In the left sidebar click **SQL Editor** → **New query**.
2. Open the file **`supabase/schema.sql`** from this project, copy everything in it, and paste it into the editor.
3. Click **Run** (bottom right). You should see "Success. No rows returned." That created your secure `wellness` table.

## 3. Make sign-up instant (optional but recommended)

By default Supabase emails a confirmation link before someone can sign in. For a
smooth demo you can turn that off:

1. Left sidebar → **Authentication** → **Sign In / Providers** (or **Providers → Email**).
2. Turn **Confirm email** *off* and save.

(If you leave it on, Pulse handles it gracefully — new users just get a "check
your email to confirm" message.)

## 4. Copy your two keys

1. Left sidebar → **Project Settings** (gear) → **API**.
2. Copy the **Project URL** and the **anon / public** key. (The anon key is *meant*
   to be public — your data is protected by the security rules from step 2.)

## 5. Add the keys — two places

### a) On your Mac, for local development

In the project folder, make a copy of **`.env.example`** named **`.env.local`** and
fill in the two values:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-long-anon-key
```

Then restart `npm run dev`. The welcome screen will now ask for an **email**.

### b) On Vercel, so the live site uses it

1. Go to your project on **[vercel.com](https://vercel.com)** → **Settings** → **Environment Variables**.
2. Add two variables (names must match exactly):
   - `VITE_SUPABASE_URL` → your Project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
3. Go to **Deployments**, open the latest, and click **Redeploy** (or just push any commit).

That's it. Pulse is now backed by a real database. 🎉

---

## What changed under the hood

- Sign-up / sign-in use **email + password** through Supabase Auth (passwords are
  hashed on Supabase's servers — Pulse never sees the raw password).
- Each account's wellness data is saved as one row in the `wellness` table and
  **syncs automatically** across every device you sign in on.
- **Row Level Security** guarantees each user can only read and write their own
  data — even though the anon key is public.
- **Guest mode** still works instantly and stays 100% local, so recruiters can
  jump in with one tap.
