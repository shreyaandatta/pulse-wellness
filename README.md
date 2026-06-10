# Pulse — Personal Wellness Tracker

**🔗 Live demo: [pulse-by-shreyaan.vercel.app](https://pulse-by-shreyaan.vercel.app/)** — no install, no sign-up, just open and start logging.

A warm, minimal daily wellness dashboard. Log **water, workouts, meals, sleep, mood & steps**, watch your **daily wellness score**, keep a **streak alive**, and see **weekly trend charts** — all in one calm, premium interface.

Everything is stored privately in your browser via `localStorage`. **No accounts, no cloud, no AI, no APIs.** Just fast and genuinely useful.

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

**Trends** let you flip between Wellness, Water, Sleep, Active minutes, Mood and Steps across 7 / 14 / 30 days, with a drawn line chart for score and animated bars for the rest, plus average / best / days-logged stats.

**Logging** is built for speed: quick-add water chips with an animated bottle, one-tap workout types with intensity, meal quality dots, a sleep slider with quality faces, a five-face mood picker with an optional note, and a steps slider. Every action gives a little toast + pop animation.

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
  lib/
    storage.js            persistence, defaults + schema migrations
    score.js              wellness scoring (transparent, weighted)
    streak.js             streak calculation
    dates.js              local-time date helpers
    units.js              metric / imperial conversion
    celebrate.js          dependency-free confetti burst (Web Animations API)
    backup.js             JSON/CSV export + validated restore
  components/             one card per pillar + ring, streak, trends, data vault, settings
    DataVault.jsx         backup / restore / install, with the history heatmap
    HistoryHeatmap.jsx    score-coloured calendar of every logged day
  styles/                 design tokens + global styles
scripts/gen-icons.mjs     generates the PWA icon set from the brand mark
```

## Privacy

All data stays on your device under the `pulse.v1` key in `localStorage`. Clearing your browser data (or the in-app **Reset all data**) wipes it. Nothing ever leaves the machine.
