// Builds the small, privacy-safe snapshot a user publishes for friends.
// This is the ONLY shape that ever leaves your own row — it never contains
// journal text, mood notes, or anything free-form, just numbers you've chosen
// to surface. `summary` is always visible to an accepted friend; `detail` is
// only revealed when you've set that friend to "detail" sharing.

import { todayKey, addDays } from './dates.js';
import { dayScore, goalsHit, scoreBand } from './score.js';
import { currentStreak } from './streak.js';
import { topBadges } from './badges.js';
import { getDay } from './storage.js';

export function buildSnapshot(state, name) {
  const key = todayKey();
  const goals = state.goals;
  const today = getDay(state, key);

  const score = dayScore(today, goals);
  const g = goalsHit(today, goals);
  const band = scoreBand(score);

  // A 7-day score trail (oldest → newest) for a tiny sparkline.
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const k = addDays(key, -i);
    last7.push(dayScore(getDay(state, k), goals));
  }

  const summary = {
    name: name || state.settings.name || 'A friend',
    score,
    band: { label: band.label, emoji: band.emoji },
    streak: currentStreak(state),
    goalsHit: g.hit,
    goalsTotal: g.total,
    last7,
    activeDays: Object.keys(state.days || {}).length,
    badges: topBadges(state, 3), // the 3 best badges to show off to friends
    dayKey: key,
  };

  // Per-pillar numbers for "detail" sharing. Still just figures, no notes.
  const activeMin = (today.workouts || []).reduce((s, w) => s + (w.minutes || 0), 0);
  const detail = {
    water: { value: today.water || 0, goal: goals.water },
    sleep: { value: today.sleep, goal: goals.sleep },
    active: { value: activeMin, goal: goals.activeMinutes },
    meals: { value: (today.meals || []).length, goal: goals.meals },
    steps: { value: today.steps || 0, goal: goals.steps },
    mood: today.mood ?? null,
  };

  return { summary, detail };
}
