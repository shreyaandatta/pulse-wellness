// Healthy daily-calorie estimation from a few simple inputs.
//
// We deliberately don't demand height + age. Instead we use the widely used
// "calories per kg of body weight" maintenance method, which already folds
// activity into a single multiplier, then apply a *safe* deficit or surplus to
// move toward the target weight — never below a sensible floor. It's an honest
// estimate, not a clinical prescription, and the UI says so.

export const GENDERS = [
  { id: 'female', label: 'Female', emoji: '♀' },
  { id: 'male', label: 'Male', emoji: '♂' },
  { id: 'other', label: 'Other', emoji: '⚧' },
];

// kcal per kg of body weight at each activity level (already includes activity).
// Men carry more lean mass, so they burn a touch more per kg.
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Mostly sitting', emoji: '🪑', kpk: { male: 28, female: 25 } },
  { id: 'light', label: 'Lightly active', emoji: '🚶', kpk: { male: 31, female: 28 } },
  { id: 'moderate', label: 'Active', emoji: '🏃', kpk: { male: 34, female: 31 } },
  { id: 'high', label: 'Very active', emoji: '🔥', kpk: { male: 38, female: 35 } },
];

// ~7700 kcal stored per kg of body weight.
const KCAL_PER_KG = 7700;

// Safe minimum daily intake — eating below this isn't healthy unsupervised.
const FLOORS = { male: 1500, female: 1200, other: 1350 };

function kcalPerKg(activity, gender) {
  const a = ACTIVITY_LEVELS.find((l) => l.id === activity) || ACTIVITY_LEVELS[1];
  if (gender === 'male') return a.kpk.male;
  if (gender === 'female') return a.kpk.female;
  return (a.kpk.male + a.kpk.female) / 2; // 'other' / unspecified → average
}

// Returns the recommended daily target plus the reasoning, or null if we don't
// have enough to compute (no current weight). All weights are in kg.
export function calorieGoal({ gender, weight, targetWeight, activity = 'light' } = {}) {
  const w = Number(weight);
  if (!w || w <= 0) return null;
  const t = Number(targetWeight) || w;

  const maintenance = Math.round(w * kcalPerKg(activity, gender));
  const floor = FLOORS[gender] ?? FLOORS.other;

  const delta = t - w; // negative → lose, positive → gain
  let direction = 'maintain';
  let perWeekKg = 0;
  let adjust = 0;
  if (delta <= -1) { direction = 'lose'; perWeekKg = 0.5; adjust = -500; }   // ~0.5 kg/wk
  else if (delta >= 1) { direction = 'gain'; perWeekKg = 0.25; adjust = 300; } // ~0.25 kg/wk lean

  let target = maintenance + adjust;
  let floored = false;
  if (target < floor) { target = floor; floored = true; }
  target = Math.round(target / 10) * 10; // tidy round number

  const weeks = perWeekKg ? Math.max(1, Math.round(Math.abs(delta) / perWeekKg)) : 0;

  return { target, maintenance, direction, perWeekKg, weeks, floored, floor, deltaKg: delta };
}
