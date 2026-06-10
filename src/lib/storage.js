// Single source of truth for persistence. Everything lives under one key —
// which account is active decides *which* key. The original 'pulse.v1' is the
// guest space, so any data logged before accounts existed is preserved.

let activeKey = 'pulse.v1';

// Point persistence at a given account's data. null/'guest' → the shared guest
// space ('pulse.v1'); a real account → its own private 'pulse.user.<id>.v1'.
export function setActiveUser(id) {
  activeKey = (!id || id === 'guest') ? 'pulse.v1' : `pulse.user.${id}.v1`;
}

// Bump this whenever the saved shape changes, and add a step to migrate().
export const SCHEMA_VERSION = 1;

export const DEFAULT_GOALS = {
  water: 2000,      // ml (metric base unit)
  sleep: 8,         // hours
  activeMinutes: 30,
  meals: 3,
  steps: 8000,
};

export const DEFAULT_SETTINGS = {
  units: 'metric',  // 'metric' | 'imperial'
  theme: 'light',   // 'light' | 'dark'
  name: '',
};

function freshDay() {
  return {
    water: 0,            // ml
    workouts: [],        // {id, type, minutes, intensity}
    meals: [],           // {id, label, type, quality}
    sleep: null,         // hours (number)
    sleepQuality: null,  // 1..5
    mood: null,          // 1..5
    moodNote: '',
    steps: 0,
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
