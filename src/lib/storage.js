// Single source of truth for persistence. Everything lives under one key.

const KEY = 'pulse.v1';

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

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { days: {}, goals: { ...DEFAULT_GOALS }, settings: { ...DEFAULT_SETTINGS } };
    const parsed = JSON.parse(raw);
    return {
      days: parsed.days || {},
      goals: { ...DEFAULT_GOALS, ...(parsed.goals || {}) },
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return { days: {}, goals: { ...DEFAULT_GOALS }, settings: { ...DEFAULT_SETTINGS } };
  }
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function getDay(state, key) {
  return state.days[key] ? { ...freshDay(), ...state.days[key] } : freshDay();
}

export { freshDay };
