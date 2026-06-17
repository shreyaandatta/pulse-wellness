// Single source of truth for persistence. Everything lives under one key —
// which account is active decides *which* key. The original 'pulse.v1' is the
// guest space, so any data logged before accounts existed is preserved.

import { DEFAULT_PILLAR_ORDER } from './pillars.js';

let activeKey = 'pulse.v1';

// Point persistence at a given account's data. null/'guest' → the shared guest
// space ('pulse.v1'); a real account → its own private 'pulse.user.<id>.v1'.
export function setActiveUser(id) {
  activeKey = (!id || id === 'guest') ? 'pulse.v1' : `pulse.user.${id}.v1`;
}

// Bump this whenever the saved shape changes, and add a step to migrate().
export const SCHEMA_VERSION = 2;

export const DEFAULT_GOALS = {
  water: 2000,      // ml (metric base unit)
  sleep: 8,         // hours
  activeMinutes: 30,
  meals: 3,
  steps: 8000,
  calories: null,   // kcal/day target — set from body profile (see lib/nutrition.js)
  protein: null,    // g/day target — set/estimated from body profile + activity
};

export const DEFAULT_SETTINGS = {
  units: 'metric',  // 'metric' | 'imperial'
  theme: 'light',   // 'light' | 'dark' | 'system' (system follows the OS, live)
  name: '',
  haptics: true,    // vibrate on taps (where supported)
  sounds: true,     // soft chime on goal celebrations
  pillarOrder: [...DEFAULT_PILLAR_ORDER], // order of the Today tracker cards
  hiddenPillars: [],                       // pillar ids to hide
  plan: 'free',     // 'free' | 'plus' — see lib/plan.js
  cycleEnabled: false, // show the menstrual-cycle tracker on Today (Plus)
  welcomed: false,  // dismiss/complete the first-run "Get started" checklist
  lastHealthSync: null, // 'YYYY-MM-DD' of the last Apple Health / Google Fit import
  skipHealthGuide: false, // skip the animated export walkthrough before the file picker
  // Body profile — drives the recommended calorie goal (see lib/nutrition.js).
  gender: '',          // 'female' | 'male' | 'other' | ''
  weight: null,        // current body weight in kg
  targetWeight: null,  // target body weight in kg
  age: null,           // years — sharpens the calorie estimate (Mifflin-St Jeor)
  height: null,        // cm — sharpens the calorie estimate (Mifflin-St Jeor)
  activity: 'light',   // activity level id (see ACTIVITY_LEVELS)
};

// Cycle-tracking store (Plus). `starts` anchors predictions; `logs` keeps
// per-day flow + symptoms. Lives at the top level (not in a day) so it can be
// reasoned about as a whole and ride backup/restore like everything else.
export const DEFAULT_CYCLE = {
  avgCycle: 28,   // typical cycle length in days (also learned from `starts`)
  periodLen: 5,   // typical bleed length in days
  starts: [],     // sorted 'YYYY-MM-DD' first-day-of-period dates
  logs: {},       // 'YYYY-MM-DD' -> { flow: 0..3, symptoms: [id] }
};

// Body-weight history — a sparse 'YYYY-MM-DD' -> kg map (you weigh in now and
// then, not every day). The source of truth for the weight trend; the latest
// entry is mirrored into settings.weight so the calorie math always sees it.
export function normalizeWeights(w) {
  if (!w || typeof w !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(w)) {
    const n = Number(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && n > 0) out[k] = n;
  }
  return out;
}

// Sparks wallet — the engagement economy (see lib/economy.js). `claims` is an
// idempotency ledger so reconciliation never double-pays; `owned`/`equipped`
// hold cosmetics, `freezes`/`frozenDays` the streak-freeze consumable, and
// `boostUntil` a Double-Sparks window. Rides backup/restore + cloud sync like
// everything else because it lives in the one state blob.
export const DEFAULT_WALLET = {
  balance: 0,        // spendable Sparks
  earned: 0,         // lifetime Sparks credited
  spent: 0,          // lifetime Sparks spent
  owned: [],         // purchased cosmetic ids
  equipped: { accent: 'honey', frame: 'none', nameplate: '' },
  freezes: 0,        // streak-freeze inventory
  frozenDays: [],    // 'YYYY-MM-DD' days a freeze is protecting
  boostUntil: null,  // ms timestamp — Double-Sparks active until
  claims: { days: {}, badges: [], streakDay: null, onboard: false },
};

export function normalizeWallet(w) {
  const x = w && typeof w === 'object' ? w : {};
  const eq = x.equipped && typeof x.equipped === 'object' ? x.equipped : {};
  const cl = x.claims && typeof x.claims === 'object' ? x.claims : {};
  return {
    balance: Math.max(0, Number(x.balance) || 0),
    earned: Math.max(0, Number(x.earned) || 0),
    spent: Math.max(0, Number(x.spent) || 0),
    owned: Array.isArray(x.owned) ? x.owned : [],
    equipped: {
      accent: eq.accent || 'honey',
      frame: eq.frame || 'none',
      nameplate: typeof eq.nameplate === 'string' ? eq.nameplate : '',
    },
    freezes: Math.max(0, Number(x.freezes) || 0),
    frozenDays: Array.isArray(x.frozenDays) ? x.frozenDays.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)) : [],
    boostUntil: Number(x.boostUntil) || null,
    claims: {
      days: cl.days && typeof cl.days === 'object' ? cl.days : {},
      badges: Array.isArray(cl.badges) ? cl.badges : [],
      streakDay: cl.streakDay || null,
      onboard: !!cl.onboard,
    },
  };
}

export function normalizeCycle(c) {
  const x = c && typeof c === 'object' ? c : {};
  return {
    avgCycle: Number(x.avgCycle) || DEFAULT_CYCLE.avgCycle,
    periodLen: Number(x.periodLen) || DEFAULT_CYCLE.periodLen,
    starts: Array.isArray(x.starts) ? [...x.starts].sort() : [],
    logs: x.logs && typeof x.logs === 'object' ? x.logs : {},
  };
}

function freshDay() {
  return {
    water: 0,            // ml
    workouts: [],        // {id, type, minutes, intensity}
    meals: [],           // {id, label, type, quality}
    sleep: null,         // hours (number) — canonical; the score reads this
    bedtime: null,       // 'HH:MM' optional — when set with waketime, derives sleep
    waketime: null,      // 'HH:MM' optional
    sleepQuality: null,  // 1..5
    mood: null,          // 1..5
    moodNote: '',
    steps: 0,
    calm: 0,             // breathing/calm sessions completed that day
    custom: {},          // custom tracker values: trackerId -> number
  };
}

// Bring any saved or imported blob up to the current schema. Data only ever
// moves forward; older shapes (or a missing version) are normalised here, so a
// backup exported by an old build still restores cleanly into a newer one.
export function migrate(parsed) {
  const data = parsed && typeof parsed === 'object' ? parsed : {};
  // No destructive steps yet — v0 (pre-versioning) and v1 share a shape.
  // Future bumps add: if ((data.version || 0) < 2) { ...transform... }
  return {
    version: SCHEMA_VERSION,
    days: data.days || {},
    goals: { ...DEFAULT_GOALS, ...(data.goals || {}) },
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
    foods: Array.isArray(data.foods) ? data.foods : [],  // user's custom foods
    trackers: Array.isArray(data.trackers) ? data.trackers : [],  // custom trackers (Plus)
    cycle: normalizeCycle(data.cycle),  // menstrual-cycle tracking (Plus)
    weights: normalizeWeights(data.weights),  // 'YYYY-MM-DD' -> kg body-weight log
    wallet: normalizeWallet(data.wallet),  // Sparks economy (see lib/economy.js)
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(activeKey);
    if (!raw) return migrate(null);
    return migrate(JSON.parse(raw));
  } catch {
    return migrate(null);
  }
}

export function saveState(state) {
  try { localStorage.setItem(activeKey, JSON.stringify({ ...state, version: SCHEMA_VERSION })); } catch {}
}

export function getDay(state, key) {
  return state.days[key] ? { ...freshDay(), ...state.days[key] } : freshDay();
}

export { freshDay };
