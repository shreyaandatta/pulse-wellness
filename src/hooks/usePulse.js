import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState, getDay, DEFAULT_GOALS } from '../lib/storage.js';
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

    // goals + settings
    setGoals: (patch) => setState((s) => ({ ...s, goals: { ...s.goals, ...patch } })),
    setSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    toggleTheme: () => setState((s) => ({ ...s, settings: { ...s.settings, theme: s.settings.theme === 'dark' ? 'light' : 'dark' } })),
    toggleUnits: () => setState((s) => ({ ...s, settings: { ...s.settings, units: s.settings.units === 'metric' ? 'imperial' : 'metric' } })),

    resetAll: () => setState((s) => ({ days: {}, goals: { ...DEFAULT_GOALS }, settings: { ...s.settings } })),
  }), [activeDay, mutateDay]);

  return { state, setState, activeDay, setActiveDay, day, ...api };
}
