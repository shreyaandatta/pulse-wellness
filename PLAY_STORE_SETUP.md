# Publishing Pulse to the Google Play Store

Pulse is already a PWA (installable web app). The simplest, no-Android-Studio way to
get it on the Play Store is to wrap it as a **TWA** (Trusted Web Activity) — a thin
Android app that runs your live site full-screen. The big win: **it auto-updates
every time you deploy to Vercel** — no rebuilding or re-uploading for content changes.

Everything in the **code** is ready (manifest, icons, `assetlinks.json` path, privacy
policy). What's left is account/upload work only you can do. Follow these in order.

---

## What's already done (in this repo)
- ✅ Web App Manifest with name, theme, and 192 / 512 / maskable icons.
- ✅ `public/.well-known/assetlinks.json` — served at
  `https://pulsebysd.vercel.app/.well-known/assetlinks.json` (needs your fingerprint, Step 3).
- ✅ Privacy policy at `https://pulsebysd.vercel.app/privacy.html` (Play requires one).

---

## Your part

### 0. Google Play Console account — one-time
- Go to <https://play.google.com/console> and pay the **one-time $25** registration fee.
- Complete **identity verification** (Google may take a day or two to approve). You can do
  the steps below in parallel while waiting.

### 1. Generate the Android app with PWABuilder (no Android Studio needed)
1. Go to <https://www.pwabuilder.com>.
2. Enter **`https://pulsebysd.vercel.app`** and click **Start**. It will score the PWA —
   it should pass (manifest + service worker + icons are all set).
3. Click **Package For Stores → Android → Google Play**.
4. In the options dialog set:
   - **Package ID:** `app.vercel.pulsebysd.twa`  ← use **exactly** this (it must match
     `assetlinks.json`). If you want a different ID, tell me and I'll update the file.
   - **App name:** `Pulse`
   - **Signing key:** choose **"Create new"**. PWABuilder generates a signing key for you.
5. Click **Download**. You get a `.zip` containing:
   - `app-release-signed.aab`  ← this is what you upload to Play.
   - `assetlinks.json`  ← contains your key's SHA-256 fingerprint (Step 3).
   - `signing.keystore` + `signing-key-info.txt`  ← **your signing key + passwords.**

> ⚠️ **Back up the keystore + passwords somewhere safe and private (and never commit them
> to GitHub).** If you lose them you can't publish updates to the same app. Do **not** paste
> them to me — keystores and passwords are credentials you keep yourself.

### 2. Create the app in Play Console and upload
1. Play Console → **Create app**: name `Pulse`, type **App**, **Free**.
2. Left menu → **Test and release → Testing → Internal testing → Create new release**.
3. Upload `app-release-signed.aab`. Let Google enable **Play App Signing** when prompted (recommended).
4. Save / review the release (don't roll out to the public yet — finish the steps below first).

### 3. Verify domain ownership (so the app runs full-screen, no URL bar)
You need the SHA-256 fingerprint(s) in `assetlinks.json`:
- **Upload key** fingerprint — it's inside the `assetlinks.json` that PWABuilder gave you.
- **Play App Signing** fingerprint — Play Console → your app → **Test and release → App
  integrity → Play app signing → SHA-256 certificate fingerprint** (available after Step 2).

Then either:
- **Paste both** into `public/.well-known/assetlinks.json` (replace the two `REPLACE_...`
  lines), commit, and push — Vercel redeploys and Google can verify; **or**
- **Send me both fingerprints** and I'll update the file and push for you.

### 4. Fill in the required Play Console declarations
In **Policy and programs / App content**, complete:
- **Privacy policy:** `https://pulsebysd.vercel.app/privacy.html`
- **Ads:** select **"No, my app does not contain ads."**
- **App access:** "All functionality is available without special access" (Pulse has a guest mode).
- **Content rating:** fill the questionnaire (a wellness tracker rates **Everyone**).
- **Target audience:** 13+ (not designed for children).
- **Data safety:** declare it honestly — see the cheat-sheet below.

**Data safety answers for Pulse:**
- Collects data? **Yes** (only if the user makes a cloud account).
- Data types: **Email address** (account) and **Health & fitness info** (the logs).
- Is data **encrypted in transit?** Yes. **Can users request deletion?** Yes (via email).
- Is data **shared** with third parties? **No.** Used for ads? **No.**
- If the user stays on-device (no account), nothing is collected.

### 5. Store listing
- Short + full description (I can write these — just ask).
- **App icon** 512×512 (use `public/icon-512.png`).
- **Feature graphic** 1024×500 (I can describe/spec one, or you make a simple branded banner).
- **At least 2 phone screenshots** — take them from the live app.

### 6. Test, then go live
1. On the **Internal testing** track, add your own email as a tester and install via the
   link Google gives you. Confirm Pulse opens **full-screen with no browser URL bar** — that
   means `assetlinks.json` verified correctly.
2. When happy, promote the release to **Production**. Google reviews it (can take a few days
   to a couple of weeks for a first app).

---

## Notes
- Because this is a TWA, **publishing a content update = just deploying to Vercel as usual.**
  You only re-upload an `.aab` if you change the app's package settings or bump its version.
- Want ads in the app later? That would be **AdMob** via a native shell (Capacitor) — a
  separate, bigger project. AdMob (unlike AdSense) is fine with app-style content.
- iOS App Store is **not** possible via this TWA route (Apple disallows pure web wrappers);
  it would need a Capacitor build + a $99/yr Apple Developer account.
