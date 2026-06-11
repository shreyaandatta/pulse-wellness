# Turning on Pulse Plus payments (Razorpay) — step by step

This makes the **Pulse Plus** upgrade take real money via **Razorpay** (auto-renewing
subscriptions, ₹99/month or ₹799/year). Until you do this, Plus still works as an
**honest demo** — the button says so and nothing is charged.

You can build and test the **entire flow in Test Mode with no KYC**. Real money
needs KYC (PAN + bank account), which you can do later.

> Prerequisite: cloud accounts must be on (see **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**).
> Plus is tied to a signed-in account.

---

## 1. Create a Razorpay account

1. Sign up at **[razorpay.com](https://razorpay.com)**.
2. Stay in **Test Mode** (toggle near the top of the dashboard) for everything below.

## 2. Get your Test API keys

1. Dashboard → **Settings → API Keys → Generate Test Key**.
2. You'll see a **Key ID** (`rzp_test_…`) and a **Key Secret**.
3. ⚠️ The **Secret** is like a password. You'll paste it into files/Vercel — **never** share it in chat or commit it.

## 3. Put the keys in `.env.local` (on your Mac)

Open **`.env.local`** (copy from `.env.example` if needed) and fill in:

```
# client (public)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
# server (secret — never commit)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

- `SUPABASE_URL` is the same Project URL as `VITE_SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY` is in Supabase → **Project Settings → API → service_role**. It's powerful — server-only, never in the browser, never committed.

## 4. Create the two plans (one command)

This makes the ₹99 monthly and ₹799 yearly plans in your Razorpay account and prints their IDs:

```bash
node scripts/setup-razorpay-plans.mjs
```

Copy the two printed lines into `.env.local`:

```
RAZORPAY_PLAN_MONTHLY=plan_xxxxxxxx
RAZORPAY_PLAN_YEARLY=plan_xxxxxxxx
```

## 5. Set up the webhook (so Plus actually unlocks after payment)

1. Dashboard → **Settings → Webhooks → Add New Webhook**.
2. **Webhook URL:** `https://pulsebysd.vercel.app/api/razorpay-webhook`
3. **Secret:** make up a strong random string. Put the **same** string in `.env.local` and Vercel as `RAZORPAY_WEBHOOK_SECRET`.
4. **Active events:** tick `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, `subscription.halted`, `subscription.pending`.
5. Save.

## 6. Add all the keys to Vercel

Vercel → your project → **Settings → Environment Variables**. Add every variable
from section 3–5 (both the `VITE_…` one and all the server ones). Then **redeploy**
(Deployments → Redeploy, or push any commit).

That's it — the upgrade button now opens real Razorpay Checkout.

## 7. Test it (Test Mode, no real money)

1. On the live site, sign in, open **Settings → See Pulse Plus → Start Plus**.
2. Razorpay opens. Use a **test card**: `4111 1111 1111 1111`, any future expiry, any CVV, any name.
3. After it succeeds, the webhook fires and Plus unlocks within a few seconds.
4. **Settings** shows your renewal date and a **Cancel subscription** button.

## 8. Going live (when you're ready to earn)

1. Complete **KYC** in Razorpay (PAN + bank account) to activate **Live Mode**.
2. Generate **Live** API keys, re-run `node scripts/setup-razorpay-plans.mjs` with the live keys to make live plans, and update the env vars (live key id/secret, live plan ids) in Vercel.
3. Recreate the webhook in Live Mode with the same URL + a secret.

> **Note on auto-renew:** card-based recurring works in Test Mode now. **UPI Autopay**
> (the most popular method in India) needs your account fully activated (KYC) before
> it can be used — so finish KYC before relying on UPI subscriptions.

---

## How it works (for the curious)

- **Secrets never reach the browser.** Creating a subscription happens in a Vercel
  serverless function (`/api/create-subscription`) using your secret key.
- **Plus can't be faked.** Whether an account has Plus lives in a Supabase
  `entitlements` table that users can only *read* — only the signed Razorpay
  **webhook** (`/api/razorpay-webhook`) can write it, after verifying the signature.
- **Graceful fallback.** No Razorpay keys → the app stays in demo mode and nothing
  breaks, exactly like cloud sync does without Supabase keys.
