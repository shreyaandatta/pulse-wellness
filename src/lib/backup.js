// Backup & portability — all client-side, no network. Turns the in-memory
// store into a portable file and safely reads one back.

import { SCHEMA_VERSION, migrate, getDay } from './storage.js';
import { dayScore } from './score.js';
import { todayKey } from './dates.js';
import { triggerDownload } from './download.js';

// ---- JSON backup (the full, restorable record) -------------------------
export function buildBackup(state) {
  return {
    app: 'Pulse',
    kind: 'pulse-backup',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    days: state.days,
    goals: state.goals,
    settings: state.settings,
    foods: state.foods || [],
    trackers: state.trackers || [],
    cycle: state.cycle || undefined,
  };
}

export function exportJSON(state) {
  const name = `pulse-backup-${todayKey()}.json`;
  triggerDownload(name, JSON.stringify(buildBackup(state), null, 2), 'application/json');
  return name;
}

// ---- CSV (one row per logged day, for spreadsheets) --------------------
function csvCell(value = '') {
  const t = String(value).replace(/"/g, '""');
  return /[",\n]/.test(t) ? `"${t}"` : t;
}

export function exportCSV(state) {
  const header = [
    'date', 'wellness_score', 'water_ml', 'active_minutes', 'workouts',
    'meals', 'avg_meal_quality', 'sleep_hours', 'sleep_quality', 'mood',
    'steps', 'mood_note',
  ];
  const rows = [header];

  Object.keys(state.days).sort().forEach((key) => {
    const d = getDay(state, key);
    const active = (d.workouts || []).reduce((s, w) => s + (w.minutes || 0), 0);
    const avgQ = d.meals?.length
      ? (d.meals.reduce((s, m) => s + (m.quality || 0), 0) / d.meals.length).toFixed(1)
      : '';
    rows.push([
      key, dayScore(d, state.goals), d.water, active, d.workouts.length,
      d.meals.length, avgQ, d.sleep ?? '', d.sleepQuality ?? '', d.mood ?? '',
      d.steps, csvCell(d.moodNote),
    ]);
  });

  const csv = rows.map((r) => r.join(',')).join('\n');
  const name = `pulse-data-${todayKey()}.csv`;
  triggerDownload(name, csv, 'text/csv');
  return name;
}

// ---- import / restore --------------------------------------------------
// Returns a clean, migrated state. Throws friendly errors the UI can show.
export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON. Choose a Pulse backup (.json).");
  }
  if (!obj || typeof obj !== 'object' || !('days' in obj) || typeof obj.days !== 'object') {
    throw new Error("That doesn't look like a Pulse backup. Choose a file you exported from Pulse.");
  }
  return migrate(obj);
}

// ---- stats for the vault header ----------------------------------------
export function dataStats(state) {
  const keys = Object.keys(state.days).sort();
  const bytes = new Blob([JSON.stringify(state)]).size;
  return {
    dayCount: keys.length,
    firstDay: keys[0] || null,
    lastDay: keys[keys.length - 1] || null,
    bytes,
  };
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
