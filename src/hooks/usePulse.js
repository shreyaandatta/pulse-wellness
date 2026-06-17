import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState, getDay, migrate, DEFAULT_GOALS, DEFAULT_WALLET } from '../lib/storage.js';
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

  // apply theme to <html>. 'system' follows the OS appearance live, so a user
  // who picks "System" flips with their phone's day/night schedule without
  // touching the app. Explicit 'light'/'dark' override the OS.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const t = state.settings.theme;
      const eff = t === 'system' ? (mq.matches ? 'dark' : 'light') : t;
      document.documentElement.setAttribute('data-theme', eff);
    };
    apply();
    if (state.settings.theme === 'system') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [state.settings.theme]);

  // Apply the equipped accent theme (a Shop cosmetic) to <html>. 'honey' is the
  // built-in skin, so it simply clears the attribute back to the default tokens.
  useEffect(() => {
    const a = state.wallet?.equipped?.accent || 'honey';
    const root = document.documentElement;
    if (a && a !== 'honey') root.setAttribute('data-accent', a);
    else root.removeAttribute('data-accent');
  }, [state.wallet?.equipped?.accent]);

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

    // sleep. Hours can be entered two ways: a direct number (slider), or a
    // bedtime → wake-up pair we turn into a duration. Whichever is used wins —
    // setting hours directly clears any stale times, and setting times derives
    // the hours, so day.sleep (what the score reads) always matches what's shown.
    setSleep: (hours, quality) => mutateDay(activeDay, (d) => ({ ...d, sleep: hours, sleepQuality: quality ?? d.sleepQuality, bedtime: null, waketime: null })),
    setSleepQuality: (quality) => mutateDay(activeDay, (d) => ({ ...d, sleepQuality: quality })),
    setSleepTimes: (bedtime, waketime, hours) => mutateDay(activeDay, (d) => ({ ...d, bedtime, waketime, sleep: hours })),

    // mood
    setMood: (mood, note) => mutateDay(activeDay, (d) => ({ ...d, mood, moodNote: note ?? d.moodNote })),

    // journal — write/edit the reflection note for ANY day (the Journal screen
    // revisits past days). Shares day.moodNote with the Mood card, so a thought
    // jotted in either place is the same single reflection for that day.
    setNote: (key, note) => mutateDay(key, (d) => ({ ...d, moodNote: note })),

    // steps
    setSteps: (steps) => mutateDay(activeDay, (d) => ({ ...d, steps: Math.max(0, steps) })),
    addSteps: (n) => mutateDay(activeDay, (d) => ({ ...d, steps: Math.max(0, d.steps + n) })),

    // breathing / calm sessions — count completed sessions for the day
    logCalm: () => mutateDay(activeDay, (d) => ({ ...d, calm: (d.calm || 0) + 1 })),

    // ---- Quick-log actions (always target TODAY) ----
    // The floating quick-log sheet and the app-icon shortcuts log "now", which
    // is always the real today — never whichever past day the user happens to be
    // reviewing in the Day switcher. These mirror the activeDay actions above but
    // pin the key to todayKey(), so they're correct regardless of what's on screen.
    addTodayWater: (ml) => mutateDay(todayKey(), (d) => ({ ...d, water: Math.max(0, d.water + ml) })),
    addTodaySteps: (n) => mutateDay(todayKey(), (d) => ({ ...d, steps: Math.max(0, d.steps + n) })),
    setTodayMood: (mood) => mutateDay(todayKey(), (d) => ({ ...d, mood })),

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

    // body weight — log today's weigh-in. Writes the sparse history map *and*
    // mirrors into settings.weight so the calorie/protein goals stay current.
    logWeight: (kg) => setState((s) => {
      const w = Math.max(0, Number(kg) || 0);
      if (!w) return s;
      return {
        ...s,
        weights: { ...(s.weights || {}), [todayKey()]: w },
        settings: { ...s.settings, weight: w },
      };
    }),

    // import from Apple Health / Google Fit (a normalised blob from
    // lib/healthImport.js). Non-destructive: steps only ever go up, sleep fills
    // an empty night, workouts dedupe by their health key, weigh-ins are added.
    importHealth: (parsed) => setState((s) => {
      if (!parsed || !parsed.days) return s;
      const days = { ...s.days };
      for (const [key, inc] of Object.entries(parsed.days)) {
        const cur = days[key] ? { ...days[key] } : getDay(s, key);
        const next = { ...cur };
        if (inc.steps > 0) next.steps = Math.max(cur.steps || 0, inc.steps);
        if ((cur.sleep == null) && inc.sleepHours > 0) next.sleep = inc.sleepHours;
        if (inc.workouts && inc.workouts.length) {
          const seen = new Set((cur.workouts || []).map((w) => w.key).filter(Boolean));
          const fresh = inc.workouts
            .filter((w) => !seen.has(w.key))
            .map((w) => ({ id: uid(), key: w.key, type: w.type, minutes: w.minutes, intensity: w.intensity }));
          if (fresh.length) next.workouts = [...(cur.workouts || []), ...fresh];
        }
        days[key] = next;
      }
      const weights = { ...(s.weights || {}), ...(parsed.weights || {}) };
      // keep settings.weight on the most recent weigh-in we now hold
      const latestKey = Object.keys(weights).sort().pop();
      const settings = {
        ...s.settings,
        lastHealthSync: todayKey(),
        ...(latestKey ? { weight: weights[latestKey] } : {}),
      };
      return { ...s, days, weights, settings };
    }),

    // goals + settings
    setGoals: (patch) => setState((s) => ({ ...s, goals: { ...s.goals, ...patch } })),
    setSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    // The topbar one-tap toggle: flip to the opposite of whatever is *showing*
    // right now (so from System it lands on an explicit light/dark). The 3-way
    // Light/Dark/System chooser lives in Settings.
    toggleTheme: () => setState((s) => {
      const cur = s.settings.theme;
      const eff = cur === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : cur;
      return { ...s, settings: { ...s.settings, theme: eff === 'dark' ? 'light' : 'dark' } };
    }),
    toggleUnits: () => setState((s) => ({ ...s, settings: { ...s.settings, units: s.settings.units === 'metric' ? 'imperial' : 'metric' } })),

    resetAll: () => setState((s) => ({ days: {}, goals: { ...DEFAULT_GOALS }, settings: { ...s.settings }, foods: s.foods || [], trackers: s.trackers || [], cycle: { ...(s.cycle || {}), starts: [], logs: {} }, weights: {}, wallet: { ...DEFAULT_WALLET } })),

    // ---- Sparks wallet (server-authoritative; see hooks/useWallet.js) ----
    // The browser never decides a balance: the server owns earning and spending.
    // This setter only mirrors whatever wallet the server returns into app state
    // so the pill, accent theme, frames, nameplate and streak-freeze keep reading
    // state.wallet. A tampered mirror is overwritten on the next sync and can't
    // buy anything the server doesn't agree it can afford.
    setWallet: (w) => setState((s) => ({ ...s, wallet: w })),

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
