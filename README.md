# Pulse — Personal Wellness Tracker

**🔗 Live demo: [pulse-by-shreyaan.vercel.app](https://pulse-by-shreyaan.vercel.app/)** — no install, no sign-up, just open and start logging.

A warm, minimal daily wellness dashboard. Log **water, workouts, meals, sleep, mood & steps**, watch your **daily wellness score**, keep a **streak alive**, and see **weekly trend charts** — all in one calm, premium interface.

By default everything is stored privately in your browser via `localStorage` — and with one optional step you can turn on **cloud sync** for a real account that follows you across devices. Either way, **insights stay statistics-only — no AI**. Just fast and genuinely useful.

Days roll over automatically at midnight in your device's local time (e.g. India Standard Time): today's entries stay stamped to today's date, and once the clock passes midnight you're on a fresh day with yesterday a tap away on the date switcher — nothing is lost or shifted. The "a line about today" journal prompt also rotates on its own, offering a different gentle question each day.

New visitors get a gentle, animated **onboarding** (name, goals, units) and can either **create an account** or **explore as a guest** in one tap. Accounts are real — passwords are hashed with **PBKDF2 (Web Crypto)** and never stored in the clear. By default they're **on-device** (private to the browser, no sync), staying true to the local-first design.

**Optional cloud sync:** add two Supabase keys and Pulse upgrades itself to **real email-and-password accounts that sync across every device**, with server-side **Row Level Security** so each user can only touch their own data. No keys → it stays fully local; guest mode is always instant and local. See **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** for a click-by-click guide.

## Run it

```bash
npm install
npm run dev      # open the printed localhost URL
```

To make a production build:

```bash
npm run build
npm run preview
```

## What's inside

A **daily wellness score** (0–100) blends five pillars — hydration, sleep, movement, nutrition and mood — each weighted and capped so a balanced day always wins. The animated ring counts up and the little pillar bars show where the points came from.

**Streaks** reward genuinely healthy days: any day scoring 50+ keeps the flame lit, with a 7-day flame strip and your all-time best. The in-progress day gets grace so you're never punished mid-morning.

**Trends** let you flip between Wellness, Water, Sleep, Active minutes, Mood and Steps across 7 / 14 / 30 days, with a drawn line chart for score and animated bars for the rest, plus average / best / days-logged stats and a **7-day moving-average** trend line on the longer ranges.

**Insights** turns your own history into understanding — entirely from statistics, no AI and no APIs. A **weekly recap** is written from your numbers ("up 3 to 65, lifted most by movement, strongest day usually Friday"). **This week / this month** show deltas against the previous period. **What's linked** computes **Pearson correlations** between your behaviours and surfaces the strong ones in plain language ("on days you sleep more, your mood tends to be higher") — honestly hedged, never claiming cause. A **weekday rhythm** chart finds your best day, and **personal records** track your all-time bests. On **Today**, gentle **rule-based nudges** notice the time of day and what's still unlogged.

**Logging** is built for speed: quick-add water chips with an animated bottle, one-tap workout types with intensity, a **searchable food database** for meals, a sleep slider with quality faces, a five-face mood picker with an optional note, and a steps slider. Every action gives a little toast + pop animation, plus optional **haptic feedback** on taps and a soft **celebration chime** when you hit a goal.

**Meals** are powered by a built-in **food library** of ~180 foods — Indian staples (roti, naan, dal, biryani, dosa, paneer dishes, street food, sweets) plus global everyday foods — each with rough nutrition (calories + macros). Search and tap to log, then pick a **quantity** (½×, 2×, or any ¼-step) so the portion fits you and the calories scale live. Can't find a food? Create a custom one with your own numbers and it's **saved for next time**. Your day shows a running calorie estimate, and you can **download the whole food database as a file** (or import one) from the Data tab.

The **streak card** also shows **how many of your five daily goals you've hit today** (e.g. 3 / 5), and you can **reorder or hide** any tracker on the Today screen from **Settings → Dashboard layout** — so Pulse fits how *you* think about your day.

You can browse **past days** with the date switcher, set your own **goals**, switch **metric/imperial units**, and toggle a **warm dark mode**. Hitting a goal sets off a little **confetti celebration** on the card that earned it.

**Your data** is its own place. A **history heatmap** lights up every day you've logged — coloured by that day's wellness score, like a calendar made of warm light. From there you can **save a full backup** (`.json`), **export a spreadsheet** (`.csv`), and **restore** from a backup on any device — with a clear confirmation before anything is replaced. Pulse is also an **installable PWA**: add it to your home screen and it runs full-screen and **fully offline**.

## Design

The visual system lives in `src/styles/tokens.css` — an **Amber & Honey** accent family over warm cream neutrals, soft shadows, `Fraunces` display + `Inter` body type, and spring-eased motion. Edit the tokens to retheme the whole app.

## Structure

```
src/
  App.jsx                 layout, tabs, day switcher, toasts
  hooks/
    usePulse.js           central store + all mutations (localStorage)
    useGoalCelebration.js fires confetti when a goal flips to "reached"
    usePWA.js             install prompt + offline status
    useAuth.js            session state; on-device or cloud, points storage at the active account
    useCloudSync.js       pulls/pushes the active account's data to Supabase (when configured)
  lib/
    auth.js               on-device accounts: PBKDF2 hashing, sign-in, session
    supabase.js           optional Supabase client (off unless two env keys are set)
    cloud.js              cloud auth + per-user JSONB state, layered over Supabase
    storage.js            account-scoped persistence, defaults + schema migrations
    score.js              wellness scoring (transparent, weighted)
    streak.js             streak calculation
    dates.js              local-time date helpers
    units.js              metric / imperial conversion
    celebrate.js          dependency-free confetti burst (Web Animations API)
    backup.js             JSON/CSV export + validated restore
    insights.js           pure statistics: correlations, summaries, records, nudges
  components/             one card per pillar + ring, streak, trends, data vault, settings
    AuthGate.jsx          welcome / sign in / sign up / guest
    Onboarding.jsx        animated first-run setup
    Insights.jsx          weekly recap, correlations, weekday rhythm, records
    SmartNudge.jsx        time-aware, rule-based suggestions on Today
    DataVault.jsx         backup / restore / install, with the history heatmap
    HistoryHeatmap.jsx    score-coloured calendar of every logged day
  styles/                 design tokens + global styles
scripts/gen-icons.mjs     generates the PWA icon set from the brand mark
```

## Privacy

All data stays on your device in `localStorage` — the guest space under `pulse.v1`, and each account under its own `pulse.user.<id>.v1` key. Account passwords are stored only as PBKDF2 hashes (with a per-account salt), never in plain text. Clearing your browser data (or the in-app **Reset all data**) wipes it. Nothing ever leaves the machine — which also means accounts are device-local and don't sync.
