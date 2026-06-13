// Healthy daily-calorie estimation.
//
// When we know height + age we use the Mifflin-St Jeor equation — the modern
// clinical standard (the same one Calculator.net uses): BMR from weight, height,
// age and sex, multiplied by an activity factor for total daily burn. Without
// height/age we fall back to the simpler "calories per kg of body weight"
// method. Either way we then apply a *safe* deficit or surplus toward the target
// weight, never below a sensible floor. An honest estimate, not a prescription.

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

// Standard activity multipliers (maintenance = BMR × factor). These map our
// four activity ids to the widely-used Harris-Benedict / Mifflin factors.
export const ACTIVITY_FACTOR = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };

function kcalPerKg(activity, gender) {
  const a = ACTIVITY_LEVELS.find((l) => l.id === activity) || ACTIVITY_LEVELS[1];
  if (gender === 'male') return a.kpk.male;
  if (gender === 'female') return a.kpk.female;
  return (a.kpk.male + a.kpk.female) / 2; // 'other' / unspecified → average
}

// Mifflin-St Jeor resting burn (kcal/day) from weight (kg), height (cm) and age.
// The sex constant is +5 for men, −161 for women, and the midpoint for 'other'.
function bmrMifflin({ gender, weight, height, age }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // 'other' / unspecified → midpoint of the two constants
}

// Returns the recommended daily target plus the reasoning, or null if we don't
// have enough to compute (no current weight). Weights in kg, height in cm.
export function calorieGoal({ gender, weight, targetWeight, activity = 'light', age, height } = {}) {
  const w = Number(weight);
  if (!w || w <= 0) return null;
  const t = Number(targetWeight) || w;
  const h = Number(height), ag = Number(age);

  // Prefer Mifflin-St Jeor when we have height + age; otherwise per-kg estimate.
  let maintenance, method;
  if (h > 0 && ag > 0) {
    const factor = ACTIVITY_FACTOR[activity] ?? ACTIVITY_FACTOR.light;
    maintenance = Math.round(bmrMifflin({ gender, weight: w, height: h, age: ag }) * factor);
    method = 'mifflin';
  } else {
    maintenance = Math.round(w * kcalPerKg(activity, gender));
    method = 'perkg';
  }
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

  return { target, maintenance, direction, perWeekKg, weeks, floored, floor, deltaKg: delta, method };
}

// ---- Macro-based food health ---------------------------------------------
// A 0–100 "nourish score" computed from a food's macros. The spine is the
// macro split — protein density lifts a food, an excessive fat ratio and a
// heavy refined-carb load (lots of carbs with little protein) pull it down.
// Macros alone can't tell an apple from a soda (both read as "just carbs", and
// there's no fibre data), so we temper the macro score with the curated
// whole-food `quality` hint. Net: protein-rich foods rate highest, whole
// produce sits comfortably mid, and sugary/greasy items sink — all driven by
// what's actually in the food.
export function foodHealth(food = {}) {
  const p = +food.protein || 0, c = +food.carbs || 0, f = +food.fat || 0;
  const macroCal = p * 4 + c * 4 + f * 9;

  let macro;
  if (macroCal <= 0) {
    macro = 75; // calorie-free (water, green tea) — count as nourishing
  } else {
    const pR = (p * 4) / macroCal;   // share of energy from protein
    const fR = (f * 9) / macroCal;   // …from fat
    const cR = (c * 4) / macroCal;   // …from carbs
    macro = 50
      + 95 * pR                                              // protein is king
      - 55 * Math.max(0, fR - 0.40)                          // very fatty → down
      - 60 * Math.max(0, cR - 0.55) * Math.max(0, 1 - 1.4 * pR); // refined carbs w/o protein
    macro = Math.max(0, Math.min(100, macro));
  }

  // Whole-food temper: the dataset's 1–5 quality, normalised to 0–100.
  const whole = ((Math.min(5, Math.max(1, +food.quality || 3)) - 1) / 4) * 100;
  return Math.round(0.7 * macro + 0.3 * whole);
}

// Map a health score to a labelled band with a colour token.
export function healthBand(score) {
  if (score >= 70) return { id: 'great', label: 'Great',     color: 'var(--good)' };
  if (score >= 55) return { id: 'good',  label: 'Good',      color: 'var(--sage)' };
  if (score >= 40) return { id: 'ok',    label: 'OK',        color: 'var(--amber-500)' };
  return                    { id: 'poor', label: 'Go easy',  color: 'var(--clay)' };
}

// ---- Protein goal estimation ---------------------------------------------
// Grams of protein per kg of body weight, by how active someone is. Ranges
// reflect common sports-nutrition guidance (≈0.8 g/kg RDA up to ~2 g/kg for
// very active / strength training). An estimate, not a prescription.
export const PROTEIN_PER_KG = {
  sedentary: 1.2,
  light: 1.4,
  moderate: 1.6,
  high: 1.9,
};

// A plain-language sense of how often each activity level trains — used to
// explain the protein estimate ("because you're active ~4–5 days/week").
export const ACTIVITY_TRAINING = {
  sedentary: 'little to no exercise',
  light: 'a workout or two a week',
  moderate: 'exercising ~3–4 days a week',
  high: 'training ~5+ days a week',
};

// Estimate a daily protein target (grams) from body weight + activity. Weight
// is in kg (Pulse stores metric internally), so this works the same whether the
// user views kg or lb. Men carry more lean mass, so we nudge every level up by
// 0.1 g/kg for males. Returns null without a usable weight.
export function proteinGoal({ weight, activity = 'light', gender } = {}) {
  const w = Number(weight);
  if (!w || w <= 0) return null;
  const base = PROTEIN_PER_KG[activity] ?? PROTEIN_PER_KG.light;
  const perKg = Math.round((base + (gender === 'male' ? 0.1 : 0)) * 10) / 10;
  const grams = Math.round((w * perKg) / 5) * 5; // tidy to nearest 5 g
  return { grams, perKg, training: ACTIVITY_TRAINING[activity] || '' };
}
