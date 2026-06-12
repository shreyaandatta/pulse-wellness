// Achievements / badges — a motivating layer on top of the existing streak and
// score engines. Every badge is earned purely from the user's own logged data,
// so they're honest: nothing is granted that the numbers don't back up.

import { bestStreak, currentStreak } from './streak.js';
import { goalsHit } from './score.js';

// A day "exists" (counts toward consistency) if anything at all was logged.
// Mirrors the server's hasAnyLog so home and reminders agree on what a day is.
function hasAnyLog(d) {
  if (!d) return false;
  return (d.water || 0) > 0 ||
    (d.meals || []).length > 0 ||
    d.sleep != null ||
    d.mood != null ||
    (d.steps || 0) > 0 ||
    (d.workouts || []).length > 0 ||
    Object.keys(d.custom || {}).length > 0;
}

// Roll every logged day into the lifetime totals the badges are scored against.
// One pass over the days map keeps this cheap even with years of history.
export function computeStats(state) {
  const days = state.days || {};
  let daysLogged = 0, perfectDays = 0;
  let totalWater = 0, totalSteps = 0, totalActiveMin = 0;

  for (const key of Object.keys(days)) {
    const d = days[key];
    if (!hasAnyLog(d)) continue;
    daysLogged++;
    totalWater += d.water || 0;
    totalSteps += d.steps || 0;
    totalActiveMin += (d.workouts || []).reduce((s, w) => s + (w.minutes || 0), 0);
    const g = goalsHit(d, state.goals);
    if (g.total > 0 && g.hit === g.total) perfectDays++;
  }

  return {
    daysLogged,
    perfectDays,
    totalWater,        // ml
    totalSteps,
    totalActiveMin,
    bestStreak: bestStreak(state),
    currentStreak: currentStreak(state),
  };
}

// The catalogue. Each badge names the stat it reads (`metric`), the `goal` it
// must reach, and how to render progress. `weight` is a prestige score used to
// pick a user's "best" badges for their shareable showcase (higher = rarer).
export const BADGES = [
  // —— Streaks ————————————————————————————————————————————————
  { id: 'spark-3',     cat: 'Streaks',     emoji: '🔥', title: 'First Spark',       desc: 'Reach a 3-day streak',          metric: 'bestStreak', goal: 3,   fmt: 'days',  weight: 12 },
  { id: 'week-7',      cat: 'Streaks',     emoji: '🗓️', title: 'Week Strong',       desc: 'Reach a 7-day streak',          metric: 'bestStreak', goal: 7,   fmt: 'days',  weight: 30 },
  { id: 'fortnight-14',cat: 'Streaks',     emoji: '⚡', title: 'Fortnight',         desc: 'Reach a 14-day streak',         metric: 'bestStreak', goal: 14,  fmt: 'days',  weight: 50 },
  { id: 'month-30',    cat: 'Streaks',     emoji: '🏔️', title: 'Monthly Momentum',  desc: 'Reach a 30-day streak',         metric: 'bestStreak', goal: 30,  fmt: 'days',  weight: 82 },
  { id: 'century-100', cat: 'Streaks',     emoji: '💯', title: 'Centurion',         desc: 'Reach a 100-day streak',        metric: 'bestStreak', goal: 100, fmt: 'days',  weight: 100 },

  // —— Showing up ————————————————————————————————————————————
  { id: 'start-1',     cat: 'Consistency', emoji: '🌱', title: 'Getting Started',   desc: 'Log your first day',            metric: 'daysLogged', goal: 1,   fmt: 'days',  weight: 5 },
  { id: 'showup-10',   cat: 'Consistency', emoji: '📆', title: 'Showing Up',        desc: 'Log 10 days',                   metric: 'daysLogged', goal: 10,  fmt: 'days',  weight: 22 },
  { id: 'devoted-50',  cat: 'Consistency', emoji: '🌟', title: 'Devoted',           desc: 'Log 50 days',                   metric: 'daysLogged', goal: 50,  fmt: 'days',  weight: 62 },
  { id: 'hundred-100', cat: 'Consistency', emoji: '🎖️', title: 'Hundred Club',      desc: 'Log 100 days',                  metric: 'daysLogged', goal: 100, fmt: 'days',  weight: 75 },

  // —— Perfect days ——————————————————————————————————————————
  { id: 'perfect-1',   cat: 'Perfect days',emoji: '✨', title: 'Perfect Day',       desc: 'Hit every goal in one day',     metric: 'perfectDays', goal: 1,  fmt: 'count', weight: 35 },
  { id: 'perfect-5',   cat: 'Perfect days',emoji: '🌈', title: 'Flawless Five',     desc: 'Have 5 perfect days',           metric: 'perfectDays', goal: 5,  fmt: 'count', weight: 45 },
  { id: 'perfect-20',  cat: 'Perfect days',emoji: '👑', title: 'Untouchable',       desc: 'Have 20 perfect days',          metric: 'perfectDays', goal: 20, fmt: 'count', weight: 80 },

  // —— Lifetime milestones ————————————————————————————————————
  { id: 'water-100l',  cat: 'Milestones',  emoji: '💧', title: 'Hydration Hero',    desc: 'Drink 100 L of water in total', metric: 'totalWater', goal: 100000,   fmt: 'water', weight: 55 },
  { id: 'water-500l',  cat: 'Milestones',  emoji: '🌊', title: 'Tidal',             desc: 'Drink 500 L of water in total', metric: 'totalWater', goal: 500000,   fmt: 'water', weight: 88 },
  { id: 'steps-500k',  cat: 'Milestones',  emoji: '👟', title: 'Trailblazer',       desc: 'Walk 500k steps in total',      metric: 'totalSteps', goal: 500000,   fmt: 'steps', weight: 65 },
  { id: 'steps-1m',    cat: 'Milestones',  emoji: '🏅', title: 'Step Millionaire',  desc: 'Walk 1,000,000 steps in total', metric: 'totalSteps', goal: 1000000,  fmt: 'steps', weight: 95 },
  { id: 'move-1000',   cat: 'Milestones',  emoji: '💪', title: 'Sweat Equity',      desc: 'Log 1,000 active minutes',      metric: 'totalActiveMin', goal: 1000, fmt: 'min',  weight: 40 },
];

export const BADGE_CATEGORIES = ['Streaks', 'Consistency', 'Perfect days', 'Milestones'];

function progressLabel(fmt, val, goal) {
  const v = Math.min(val, goal);
  if (fmt === 'water') return `${Math.round(v / 1000)} / ${Math.round(goal / 1000)} L`;
  if (fmt === 'steps') return `${kfmt(v)} / ${kfmt(goal)}`;
  if (fmt === 'min')   return `${Math.round(v)} / ${goal} min`;
  if (fmt === 'days')  return `${v} / ${goal} ${goal === 1 ? 'day' : 'days'}`;
  return `${v} / ${goal}`;
}

function kfmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

// Resolve the catalogue against the user's stats into render-ready badges:
// earned flag, 0..1 progress, and a human label like "5 / 7 days".
export function resolveBadges(state) {
  const stats = computeStats(state);
  const badges = BADGES.map((b) => {
    const val = stats[b.metric] || 0;
    const earned = val >= b.goal;
    return {
      ...b,
      value: val,
      earned,
      progress: Math.max(0, Math.min(1, val / b.goal)),
      progressLabel: progressLabel(b.fmt, val, b.goal),
    };
  });
  const earnedCount = badges.filter((b) => b.earned).length;
  // The single closest badge still locked — the "next up" carrot.
  const next = badges
    .filter((b) => !b.earned)
    .sort((a, b) => b.progress - a.progress)[0] || null;

  return { badges, stats, earnedCount, total: badges.length, next };
}

// A user's "best" earned badges (highest prestige first) — the ones we surface
// in their shareable showcase. Returns a slim shape safe to publish to friends.
export function topBadges(state, n = 3) {
  const stats = computeStats(state);
  return BADGES
    .filter((b) => (stats[b.metric] || 0) >= b.goal)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n)
    .map((b) => ({ id: b.id, emoji: b.emoji, title: b.title }));
}
