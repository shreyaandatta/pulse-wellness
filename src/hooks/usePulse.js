import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState, getDay, migrate, DEFAULT_GOALS } from '../lib/storage.js';
import { todayKey } from '../lib/dates.js';

const uid = () => Math.random().toString(36).slice(2, 9);

// Central state hook. Owns the whole Pulse store + all mutations.
export function usePulse() {
  const [state, setState] = useState(loadState);
  const [activeDay, setActiveDay] = useState(todayKey());
  const first = useRef(true);

  // persist on change
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    saveState(state);
  }, [state]);

  // apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
  }, [state.settings.theme]);

  // If midnight passes while the app is open, roll the view onto the new day —
  // but only when the user was sitting on what *had* been today, so we never
  // yank them away from a past day they're reviewing. Days are keyed by the
  // device's local date (so, India time on your phone).
  const lastToday = useRef(todayKey());
  useEffect(() => {
    const check = () => {
      const t = todayKey();
      if (t !== lastToday.current) {
        setActiveDay((cur) => (cur === lastToday.current ? t : cur));
        lastToday.current = t;
      }
    };
    const id = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check); };
  }, []);

  const mutateDay = useCallback((key, fn) => {
    setState((s) => {
      const day = getDay(s, key);
      const next = fn({ ...day });
      return { ...s, days: { ...s.days, [key]: next } };
    });
  }, []);

  const day = getDay(state, activeDay);

  const api = useMemo(() => ({
    // water (ml)
    addWater: (ml) => mutateDay(activeDay, (d) => ({ ...d, water: Math.max(0, d.water + ml) })),
    setWater: (ml) => mutateDay(activeDay, (d) => ({ ...d, water: Math.max(0, ml) })),

    // workouts
    addWorkout: (w) => mutateDay(activeDay, (d) => ({ ...d, workouts: [...d.workouts, { id: uid(), ...w }] })),
    removeWorkout: (id) => mutateDay(activeDay, (d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== id) })),

    // meals
    addMeal: (m) => mutateDay(activeDay, (d) => ({ ...d, meals: [...d.meals, { id: uid(), ...m }] })),
    removeMeal: (id) => mutateDay(activeDay, (d) => ({ ...d, meals: d.meals.filter((x) => x.id !== id) })),

    // sleep
    setSleep: (hours, quality) => mutateDay(activeDay, (d) => ({ ...d, sleep: hours, sleepQuality: quality ?? d.sleepQuality })),

    // mood
    setMood: (mood, note) => mutateDay(activeDay, (d) => ({ ...d, mood, moodNote: note ?? d.moodNote })),

    // steps
    setSteps: (steps) => mutateDay(activeDay, (d) => ({ ...d, steps: Math.max(0, steps) })),
    addSteps: (n) => mutateDay(activeDay, (d) => ({ ...d, steps: Math.max(0, d.steps + n) })),

    // breathing / calm sessions — count completed sessions for the day
    logCalm: () => mutateDay(activeDay, (d) => ({ ...d, calm: (d.calm || 0) + 1 })),

    // menstrual cycle (Plus). Period starts anchor predictions; per-day logs
    // hold flow + symptoms. See lib/cycle.js for the math.
    setCycleConfig: (patch) => setState((s) => ({ ...s, cycle: { ...s.cycle, ...patch } })),
    togglePeriodStart: (key) => setState((s) => {
      const starts = s.cycle?.starts || [];
      const has = starts.includes(key);
      const nextStarts = has ? starts.filter((x) => x !== key) : [...starts, key].sort();
      const logs = { ...(s.cycle?.logs || {}) };
      if (has) { if (logs[key]) logs[key] = { ...logs[key], flow: 0 }; }
      else { logs[key] = { flow: logs[key]?.flow || 2, symptoms: logs[key]?.symptoms || [] }; }
      return { ...s, cycle: { ...s.cycle, starts: nextStarts, logs } };
    }),
    setCycleFlow: (key, flow) => setState((s) => {
      const logs = { ...(s.cycle?.logs || {}) };
      logs[key] = { symptoms: [], ...(logs[key] || {}), flow };
      return { ...s, cycle: { ...s.cycle, logs } };
    }),
    toggleCycleSymptom: (key, id) => setState((s) => {
      const logs = { ...(s.cycle?.logs || {}) };
      const cur = logs[key]?.symptoms || [];
      const symptoms = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      logs[key] = { flow: 0, ...(logs[key] || {}), symptoms };
      return { ...s, cycle: { ...s.cycle, logs } };
    }),

    // goals + settings
    setGoals: (patch) => setState((s) => ({ ...s, goals: { ...s.goals, ...patch } })),
    setSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    toggleTheme: () => setState((s) => ({ ...s, settings: { ...s.settings, theme: s.settings.theme === 'dark' ? 'light' : 'dark' } })),
    toggleUnits: () => setState((s) => ({ ...s, settings: { ...s.settings, units: s.settings.units === 'metric' ? 'imperial' : 'metric' } })),

    resetAll: () => setState((s) => ({ days: {}, goals: { ...DEFAULT_GOALS }, settings: { ...s.settings }, foods: s.foods || [], trackers: s.trackers || [], cycle: { ...(s.cycle || {}), starts: [], logs: {} } })),

    // custom trackers (Plus) — definitions live in state.trackers, the day's
    // values in day.custom keyed by tracker id.
    addTracker: (t) => setState((s) => ({ ...s, trackers: [...(s.trackers || []), { id: uid(), ...t }] })),
    updateTracker: (id, patch) => setState((s) => ({ ...s, trackers: (s.trackers || []).map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    removeTracker: (id) => setState((s) => ({ ...s, trackers: (s.trackers || []).filter((t) => t.id !== id) })),
    addCustom: (id, n) => mutateDay(activeDay, (d) => ({ ...d, custom: { ...(d.custom || {}), [id]: Math.max(0, (d.custom?.[id] || 0) + n) } })),
    setCustom: (id, v) => mutateDay(activeDay, (d) => ({ ...d, custom: { ...(d.custom || {}), [id]: Math.max(0, v) } })),

    // custom food library
    addFood: (food) => setState((s) => ({ ...s, foods: [...(s.foods || []), food] })),
    removeFood: (id) => setState((s) => ({ ...s, foods: (s.foods || []).filter((f) => f.id !== id) })),
    setFoods: (foods) => setState((s) => ({ ...s, foods })),

    // Replace the entire store from a restored backup (already migrated/validated).
    replaceAll: (incoming) => setState(() => migrate(incoming)),
    // Remember the moment of the last export, to nudge stale backups.
    markBackup: () => setState((s) => ({ ...s, settings: { ...s.settings, lastBackupAt: Date.now() } })),
  }), [activeDay, mutateDay]);

  return { state, setState, activeDay, setActiveDay, day, ...api };
}
