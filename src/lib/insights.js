// insights.js — the intelligence layer, built entirely on statistics over the
// user's OWN logged history. No AI, no network, no external data: every number
// here is derived from what's in localStorage. The only reference points are
// the user's own goals.

import { getDay } from './storage.js';
import { dayScore } from './score.js';
import { todayKey, addDays, keyToDate, lastNDays, prettyDate } from './dates.js';
import { bestStreak } from './streak.js';
import { waterCurrentLabel } from './units.js';

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---- small stats helpers ----------------------------------------------
const sum = (a) => a.reduce((s, x) => s + x, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);

// Pearson correlation coefficient, −1..1. Returns 0 for degenerate input.
export function pearson(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x), my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

// 7-day (windowed) moving average over a numeric series.
export function movingAverage(values, window = 7) {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return mean(slice);
  });
}

// All logged day-keys, chronological.
function loggedKeys(state) {
  return Object.keys(state.days).sort();
}

export function dataDepth(state) {
  return loggedKeys(state).length;
}

// Per-day metric value, or null when the user didn't actually log it. Keeping
// "not logged" distinct from a true zero is what keeps the stats honest.
const METRIC_VALUE = {
  water:    (d) => (d.water > 0 ? d.water : null),
  sleep:    (d) => (d.sleep != null ? d.sleep : null),
  movement: (d) => { const m = (d.workouts || []).reduce((s, w) => s + (w.minutes || 0), 0); return d.workouts?.length ? m : null; },
  steps:    (d) => (d.steps > 0 ? d.steps : null),
  mood:     (d) => (d.mood != null ? d.mood : null),
};

export const METRIC_LABEL = {
  water: 'Hydration', sleep: 'Sleep', movement: 'Movement', steps: 'Steps', mood: 'Mood', score: 'Wellness',
};

// =======================================================================
// CORRELATIONS — which behaviours move together, in plain language.
// =======================================================================
const CORR_PAIRS = [
  ['sleep', 'mood'], ['movement', 'mood'], ['steps', 'mood'], ['water', 'mood'],
  ['movement', 'sleep'], ['steps', 'sleep'], ['water', 'sleep'], ['steps', 'movement'],
];
const MIN_PAIR_DAYS = 8;

function strengthBand(r) {
  const a = Math.abs(r);
  if (a >= 0.5) return { label: 'Strong link', weight: a };
  if (a >= 0.3) return { label: 'Moderate link', weight: a };
  return null;
}

function corrSentence(a, b, r) {
  const more = { water: 'drink more water', sleep: 'sleep more', movement: 'move more', steps: 'walk more' };
  const outcome = { mood: 'mood', sleep: 'sleep', movement: 'activity' };
  const lead = more[a] || `log more ${METRIC_LABEL[a].toLowerCase()}`;
  const tail = outcome[b] || METRIC_LABEL[b].toLowerCase();
  return `On days you ${lead}, your ${tail} tends to be ${r > 0 ? 'higher' : 'lower'}.`;
}

export function correlations(state) {
  const keys = loggedKeys(state);
  const out = [];
  for (const [a, b] of CORR_PAIRS) {
    const xs = [], ys = [];
    for (const k of keys) {
      const d = getDay(state, k);
      const va = METRIC_VALUE[a](d), vb = METRIC_VALUE[b](d);
      if (va != null && vb != null) { xs.push(va); ys.push(vb); }
    }
    if (xs.length < MIN_PAIR_DAYS) continue;
    const r = pearson(xs, ys);
    const band = strengthBand(r);
    if (!band) continue;
    out.push({ a, b, r, n: xs.length, label: band.label, weight: band.weight,
      pair: `${METRIC_LABEL[a]} ↔ ${METRIC_LABEL[b]}`, sentence: corrSentence(a, b, r) });
  }
  return out.sort((p, q) => q.weight - p.weight).slice(0, 3);
}

// =======================================================================
// PERIOD SUMMARY — this week vs last, this month vs last.
// =======================================================================
const SUMMARY_METRICS = ['sleep', 'movement', 'water', 'steps', 'mood'];

function windowAverages(state, goals, keys) {
  const logged = keys.filter((k) => state.days[k]);
  const scoreVals = logged.map((k) => dayScore(getDay(state, k), goals));
  const res = { score: logged.length ? mean(scoreVals) : null, logged: logged.length };
  for (const m of SUMMARY_METRICS) {
    const vals = logged.map((k) => METRIC_VALUE[m](getDay(state, k))).filter((v) => v != null);
    res[m] = vals.length ? mean(vals) : null;
  }
  return res;
}

// How big a metric's change is, scaled 0..1ish against its goal, so movers in
// different units (ml vs minutes) can be compared to find the biggest one.
function normalize(metric, delta, goals) {
  const denom = { water: goals.water, sleep: goals.sleep, movement: goals.activeMinutes, steps: goals.steps, mood: 5 }[metric] || 1;
  return delta / denom;
}

function compareWindows(state, goals, n) {
  const cur = windowAverages(state, goals, lastNDays(n));
  const prev = windowAverages(state, goals, lastNDays(n, addDays(todayKey(), -n)));
  const metrics = {};
  for (const m of ['score', ...SUMMARY_METRICS]) {
    const c = cur[m], p = prev[m];
    const delta = c != null && p != null ? c - p : null;
    metrics[m] = { cur: c, prev: p, delta, norm: delta != null && m !== 'score' ? normalize(m, delta, goals) : delta };
  }
  return { metrics, loggedCur: cur.logged, loggedPrev: prev.logged };
}

export function periodSummary(state, goals) {
  return { week: compareWindows(state, goals, 7), month: compareWindows(state, goals, 30) };
}

// =======================================================================
// WEEKDAY RHYTHM — average wellness by day of week.
// =======================================================================
export function weekdayRhythm(state, goals) {
  const buckets = Array.from({ length: 7 }, () => []);
  for (const k of loggedKeys(state)) buckets[keyToDate(k).getDay()].push(dayScore(getDay(state, k), goals));
  const avgs = buckets.map((b) => (b.length ? mean(b) : null));
  const counts = buckets.map((b) => b.length);
  let best = null, worst = null;
  avgs.forEach((v, i) => {
    if (v == null) return;
    if (!best || v > best.val) best = { dow: i, val: v, name: WD[i] };
    if (!worst || v < worst.val) worst = { dow: i, val: v, name: WD[i] };
  });
  return { avgs, counts, best, worst };
}

// =======================================================================
// PERSONAL RECORDS — your all-time bests.
// =======================================================================
export function personalRecords(state, goals, units) {
  const keys = loggedKeys(state);
  const recs = [];
  const track = (label, emoji, getter, fmt) => {
    let best = null;
    for (const k of keys) {
      const v = getter(getDay(state, k));
      if (v == null) continue;
      if (!best || v > best.v) best = { v, k };
    }
    if (best) recs.push({ label, emoji, value: fmt(best.v), date: prettyDate(best.k) });
  };
  track('Best wellness score', '🌟', (d) => dayScore(d, goals), (v) => Math.round(v));
  track('Most steps', '👟', (d) => d.steps || 0, (v) => v.toLocaleString());
  track('Most water', '💧', (d) => d.water || 0, (v) => waterCurrentLabel(v, units));
  track('Most active', '🔥', (d) => (d.workouts || []).reduce((s, w) => s + (w.minutes || 0), 0), (v) => `${v} min`);
  track('Longest sleep', '🌙', (d) => d.sleep || 0, (v) => `${v.toFixed(1)} h`);
  const streak = bestStreak(state);
  if (streak > 0) recs.push({ label: 'Longest streak', emoji: '🏆', value: `${streak} ${streak === 1 ? 'day' : 'days'}`, date: '' });
  return recs;
}

// =======================================================================
// SMART NUDGES — rule-based, time-aware suggestions for today only.
// =======================================================================
export function nudges(state, goals, units, now = new Date()) {
  const key = todayKey(now);
  const d = getDay(state, key);
  const h = now.getHours();
  const active = (d.workouts || []).reduce((s, w) => s + (w.minutes || 0), 0);

  const met = {
    water: d.water >= goals.water,
    steps: d.steps >= goals.steps,
    move: active >= goals.activeMinutes,
    sleep: (d.sleep || 0) >= goals.sleep,
    meals: d.meals.length >= goals.meals,
  };
  if (Object.values(met).every(Boolean)) {
    return [{ tone: 'win', emoji: '🌟', text: 'Every goal met today. Beautifully balanced — enjoy it.' }];
  }

  const out = [];
  if (d.sleep == null && h < 12) out.push({ pri: 1, tone: 'tip', emoji: '🌙', text: "Start the day right — log last night's sleep." });
  if (d.mood == null && h >= 18) out.push({ pri: 1, tone: 'tip', emoji: '💭', text: 'How did today feel? A quick mood check rounds it off.' });
  if (!met.water && h >= 16) out.push({ pri: 2, tone: 'tip', emoji: '💧', text: `${waterCurrentLabel(goals.water - d.water, units)} to your water goal — a glass now keeps the day on track.` });
  if (!met.steps && d.steps > 0 && h >= 18) out.push({ pri: 2, tone: 'tip', emoji: '👟', text: `${(goals.steps - d.steps).toLocaleString()} steps to your goal. A short walk closes it.` });
  if (!met.move && active === 0 && h >= 15) out.push({ pri: 3, tone: 'tip', emoji: '🔥', text: 'No movement logged yet — even 10 minutes counts.' });

  return out.sort((a, b) => a.pri - b.pri).slice(0, 2);
}

// =======================================================================
// WEEKLY RECAP — a warm, written summary assembled from the numbers above.
// Returns styled tokens so the UI can emphasise the figures; still pure data.
// =======================================================================
export function weeklyRecap(state, goals) {
  const { week } = periodSummary(state, goals);
  const rhythm = weekdayRhythm(state, goals);
  const s = week.metrics.score;
  if (week.loggedCur === 0) return { hasData: false, tokens: [] };

  const t = [];
  const push = (text, em) => t.push({ text, em });
  const round = (v) => Math.round(v);

  // opening, keyed to the score trend
  if (s.delta == null) push('Your week is taking shape');
  else if (s.delta >= 4) push('This week is looking ', null), push('brighter', 'good');
  else if (s.delta <= -4) push('A quieter week so far');
  else push('A steady week');

  // score line
  if (s.cur != null) {
    push(' — your wellness score is ');
    if (s.delta == null) push(`averaging ${round(s.cur)}`, 'em');
    else if (s.delta >= 1) push(`up ${round(s.delta)} to ${round(s.cur)}`, 'good');
    else if (s.delta <= -1) push(`down ${Math.abs(round(s.delta))} to ${round(s.cur)}`, 'bad');
    else push(`holding near ${round(s.cur)}`, 'em');
  }
  push('. ');

  // biggest mover among the pillars (largest normalized change)
  const movers = SUMMARY_METRICS
    .map((m) => ({ m, norm: week.metrics[m].norm }))
    .filter((x) => x.norm != null && Math.abs(x.norm) >= 0.08)
    .sort((a, b) => Math.abs(b.norm) - Math.abs(a.norm));
  if (movers.length) {
    const top = movers[0];
    const name = METRIC_LABEL[top.m].toLowerCase();
    if (top.norm > 0) { push('Lifted most by '); push(name, 'good'); push('. '); }
    else { push('Held back a little by '); push(name, 'bad'); push('. '); }
  }

  // best weekday
  if (rhythm.best && rhythm.counts[rhythm.best.dow] >= 2) {
    push('Your strongest day is usually ');
    push(rhythm.best.name, 'em');
    push('.');
  }

  return { hasData: true, tokens: t };
}
