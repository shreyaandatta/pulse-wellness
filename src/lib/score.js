// Wellness score — a transparent 0..100 blend of the day's five pillars.
// Each pillar contributes a weighted, capped sub-score so a balanced day
// always beats a lopsided one.

import { getDay } from './storage.js';
import { foodHealth } from './nutrition.js';

const WEIGHTS = { water: 20, sleep: 25, movement: 25, nutrition: 15, mood: 15 };

export function pillarScores(day, goals) {
  // Water: ratio to goal, capped at 1.
  const water = clamp01(day.water / Math.max(1, goals.water));

  // Sleep: best near goal; penalise both too little and too much.
  let sleep = 0;
  if (day.sleep != null) {
    const diff = Math.abs(day.sleep - goals.sleep);
    sleep = clamp01(1 - diff / 4); // 4h off goal => 0
  }

  // Movement: total active minutes vs goal.
  const activeMin = (day.workouts || []).reduce((s, w) => s + (w.minutes || 0), 0);
  const movement = clamp01(activeMin / Math.max(1, goals.activeMinutes));

  // Nutrition: meals logged vs goal, weighted by how healthy those meals are.
  // Each meal's health is computed from its macros (see lib/nutrition.js), so
  // a day of protein-rich, balanced meals scores higher than the same number
  // of sugary ones.
  const meals = day.meals || [];
  const mealRatio = clamp01(meals.length / Math.max(1, goals.meals));
  const avgHealth = meals.length ? meals.reduce((s, m) => s + foodHealth(m), 0) / meals.length / 100 : 0.6;
  const nutrition = clamp01(mealRatio * (0.55 + 0.45 * avgHealth));

  // Mood: 1..5 → 0..1.
  const mood = day.mood != null ? (day.mood - 1) / 4 : 0;

  return { water, sleep, movement, nutrition, mood };
}

export function dayScore(day, goals) {
  const p = pillarScores(day, goals);
  const total =
    p.water * WEIGHTS.water +
    p.sleep * WEIGHTS.sleep +
    p.movement * WEIGHTS.movement +
    p.nutrition * WEIGHTS.nutrition +
    p.mood * WEIGHTS.mood;
  return Math.round(total);
}

export function scoreFor(state, key) {
  return dayScore(getDay(state, key), state.goals);
}

// How many of the day's five numeric goals are met right now (water, sleep,
// movement, meals, steps). Mood isn't goal-based so it's excluded.
export function goalsHit(day, goals) {
  const activeMin = (day.workouts || []).reduce((s, w) => s + (w.minutes || 0), 0);
  const checks = [
    { id: 'water',   met: (day.water || 0) >= goals.water },
    { id: 'sleep',   met: day.sleep != null && day.sleep >= goals.sleep },
    { id: 'movement',met: activeMin >= goals.activeMinutes },
    { id: 'meals',   met: (day.meals || []).length >= goals.meals },
    { id: 'steps',   met: (day.steps || 0) >= goals.steps },
  ];
  return { hit: checks.filter((c) => c.met).length, total: checks.length, checks };
}

export function scoreBand(score) {
  if (score >= 80) return { label: 'Thriving', color: 'var(--good)', emoji: '🌟' };
  if (score >= 60) return { label: 'Steady', color: 'var(--amber-500)', emoji: '✨' };
  if (score >= 35) return { label: 'Building', color: 'var(--warn)', emoji: '🌱' };
  return { label: 'Resting', color: 'var(--text-faint)', emoji: '🌙' };
}

export const PILLAR_META = {
  water:     { label: 'Hydration', color: 'var(--water)', icon: '💧' },
  sleep:     { label: 'Sleep',     color: 'var(--plum)',  icon: '🌙' },
  movement:  { label: 'Movement',  color: 'var(--clay)',  icon: '🔥' },
  nutrition: { label: 'Nutrition', color: 'var(--sage)',  icon: '🥗' },
  mood:      { label: 'Mood',      color: 'var(--rose)',  icon: '🌤️' },
};

function clamp01(n) { return Math.max(0, Math.min(1, n || 0)); }
