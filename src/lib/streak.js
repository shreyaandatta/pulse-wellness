// Streak logic: a day "counts" toward a streak if its wellness score clears
// a threshold OR the user logged at least one thing. We use the score gate so
// streaks reward genuinely healthy days.

import { todayKey, addDays } from './dates.js';
import { scoreFor } from './score.js';

const THRESHOLD = 50;

export function dayCounts(state, key) {
  return scoreFor(state, key) >= THRESHOLD;
}

// Current streak counts back from today. If today isn't logged yet, the streak
// is still "alive" based on yesterday, so we don't punish an in-progress day.
export function currentStreak(state) {
  let cur = todayKey();
  let count = 0;

  if (!dayCounts(state, cur)) {
    cur = addDays(cur, -1); // grace for the in-progress day
  }
  while (dayCounts(state, cur)) {
    count++;
    cur = addDays(cur, -1);
  }
  return count;
}

export function bestStreak(state) {
  const keys = Object.keys(state.days).sort();
  if (!keys.length) return Math.max(currentStreak(state), 0);
  let best = 0, run = 0;
  let cursor = keys[0];
  const end = todayKey();
  // walk continuous calendar range
  while (cursor <= end) {
    if (dayCounts(state, cursor)) { run++; best = Math.max(best, run); }
    else run = 0;
    cursor = addDays(cursor, 1);
  }
  return Math.max(best, currentStreak(state));
}

export const STREAK_THRESHOLD = THRESHOLD;
