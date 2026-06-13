// Menstrual-cycle math — all client-side, all derived from the days the user
// marks as a period start. Predictions assume a regular cycle and update as
// soon as a new start is logged. Nothing here is medical advice; it's an
// estimate to help the user see the shape of their month.

import { keyToDate, todayKey, addDays, prettyDate } from './dates.js';

// The symptoms the cycle card lets you tap. Kept small and tasteful.
export const SYMPTOMS = [
  { id: 'cramps',   label: 'Cramps',      emoji: '🤕' },
  { id: 'headache', label: 'Headache',    emoji: '🤯' },
  { id: 'fatigue',  label: 'Fatigue',     emoji: '😴' },
  { id: 'bloating', label: 'Bloating',    emoji: '🎈' },
  { id: 'tender',   label: 'Tender',      emoji: '💗' },
  { id: 'acne',     label: 'Breakouts',   emoji: '🌋' },
  { id: 'cravings', label: 'Cravings',    emoji: '🍫' },
  { id: 'moody',    label: 'Mood swings', emoji: '🌪️' },
  { id: 'backache', label: 'Backache',    emoji: '🪨' },
];

// Flow intensities, light → heavy.
export const FLOW = [
  { v: 1, label: 'Light',  emoji: '💧' },
  { v: 2, label: 'Medium', emoji: '🩸' },
  { v: 3, label: 'Heavy',  emoji: '🌊' },
];

const DAY_MS = 86400000;
export function daysBetween(a, b) {
  return Math.round((keyToDate(b) - keyToDate(a)) / DAY_MS);
}

export function sortedStarts(cycle) {
  return [...(cycle?.starts || [])].sort();
}

// Learn the average cycle length from the gaps between logged starts, falling
// back to the user's configured value when there isn't enough history yet.
export function learnedAvg(cycle) {
  const s = sortedStarts(cycle);
  if (s.length >= 2) {
    let sum = 0;
    for (let i = 1; i < s.length; i++) sum += daysBetween(s[i - 1], s[i]);
    const avg = Math.round(sum / (s.length - 1));
    if (avg >= 18 && avg <= 45) return avg; // ignore outliers (mis-logs)
  }
  return cycle?.avgCycle || 28;
}

function phaseFor(day, periodLen, ovulation) {
  if (day <= periodLen)        return { id: 'menstrual',  label: 'Menstrual',  emoji: '🩸', color: 'var(--rose)' };
  if (day < ovulation - 1)     return { id: 'follicular', label: 'Follicular', emoji: '🌱', color: 'var(--sage)' };
  if (day <= ovulation + 1)    return { id: 'ovulation',  label: 'Ovulation',  emoji: '✨', color: 'var(--amber-500)' };
  return                              { id: 'luteal',     label: 'Luteal',     emoji: '🌙', color: 'var(--plum)' };
}

// The full picture for a reference date (defaults to today). Returns null when
// nothing's been logged yet, or when the date sits before tracking began.
export function cycleStatus(cycle, ref = todayKey()) {
  const s = sortedStarts(cycle);
  if (!s.length) return null;
  if (daysBetween(s[0], ref) < 0) return null; // before the first logged period

  const avg = learnedAvg(cycle);
  const periodLen = cycle?.periodLen || 5;
  const last = s[s.length - 1];

  // Project the current cycle forward in case a start wasn't logged on time.
  const gaps = Math.max(0, Math.floor(daysBetween(last, ref) / avg));
  const anchor = addDays(last, gaps * avg);
  const dayOfCycle = daysBetween(anchor, ref) + 1;

  const nextStart = addDays(anchor, avg);
  const daysUntilNext = daysBetween(ref, nextStart);
  const ovulation = Math.max(7, avg - 14); // luteal phase is the steady ~14 days
  const phase = phaseFor(dayOfCycle, periodLen, ovulation);
  const fertile = dayOfCycle >= ovulation - 4 && dayOfCycle <= ovulation + 1;

  return { dayOfCycle, avg, periodLen, anchor, nextStart, daysUntilNext, ovulation, phase, fertile, lastStart: last };
}

// The next few predicted period start dates, for a little look-ahead.
export function upcomingStarts(cycle, count = 3, ref = todayKey()) {
  const st = cycleStatus(cycle, ref);
  if (!st) return [];
  const out = [];
  let d = st.nextStart;
  for (let i = 0; i < count; i++) { out.push({ key: d, label: prettyDate(d), inDays: daysBetween(ref, d) }); d = addDays(d, st.avg); }
  return out;
}

// A gentle, data-grounded insight: how mood on logged period days compares to
// the rest of the month. Needs a little of each to say anything.
export function periodMoodInsight(cycle, days) {
  const logs = cycle?.logs || {};
  let pSum = 0, pN = 0, oSum = 0, oN = 0;
  for (const [k, d] of Object.entries(days || {})) {
    if (d?.mood == null) continue;
    if ((logs[k]?.flow || 0) > 0) { pSum += d.mood; pN++; }
    else { oSum += d.mood; oN++; }
  }
  if (pN < 2 || oN < 2) return null;
  return { period: pSum / pN, other: oSum / oN, pN, oN, delta: pSum / pN - oSum / oN };
}
