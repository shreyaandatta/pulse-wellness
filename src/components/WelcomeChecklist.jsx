import { useEffect, useRef } from 'react';
import { IconCheck, IconSparkle } from './Icons.jsx';
import { celebrate } from '../lib/celebrate.js';

// The first few actions that turn a blank Today into a felt one. Each detects
// completion from today's log, so rows check themselves off as the new user
// logs — no manual ticking.
const STEPS = [
  { id: 'water',  emoji: '💧', label: 'Log a glass of water',     done: (d) => d.water > 0,            target: 'water' },
  { id: 'meal',   emoji: '🥗', label: 'Add your first meal',       done: (d) => (d.meals || []).length > 0, target: 'meal' },
  { id: 'sleep',  emoji: '🌙', label: 'Set how you slept',         done: (d) => d.sleep != null,        target: 'sleep' },
  { id: 'mood',   emoji: '🌤️', label: 'Check in your mood',        done: (d) => d.mood != null,         target: 'mood' },
  { id: 'breath', emoji: '🌬️', label: 'Take a one-minute breath',  done: (d) => (d.calm || 0) > 0,      target: 'breath' },
];

// A gentle first-run guide. Shows only for brand-new accounts (App gates it),
// celebrates when every step is done, and gets out of the way once finished or
// dismissed. The "welcomed" flag in settings makes the dismissal permanent.
export default function WelcomeChecklist({ day, name, onJump, onDismiss }) {
  const doneCount = STEPS.filter((s) => s.done(day)).length;
  const allDone = doneCount === STEPS.length;
  const pct = (doneCount / STEPS.length) * 100;

  // When the last step lands, throw a little confetti, then retire the card so
  // it never reappears. Keep onDismiss in a ref so unrelated re-renders during
  // the celebration window don't clear and (because allDone is unchanged) fail
  // to reschedule the timer.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  useEffect(() => {
    if (!allDone) return undefined;
    celebrate(null, 50);
    const t = setTimeout(() => onDismissRef.current(), 2600);
    return () => clearTimeout(t);
  }, [allDone]);

  return (
    <div className="welcome-card">
      <div className="wc-head">
        <div className="wc-title">
          <IconSparkle size={16} />
          <span>{allDone ? "You're all set!" : `Welcome${name ? `, ${name}` : ''}`}</span>
        </div>
        {!allDone && <button className="wc-skip" onClick={onDismiss}>Skip</button>}
      </div>
      <p className="wc-sub">
        {allDone
          ? 'That’s the whole loop — Pulse takes it from here. 🎉'
          : 'A few quick check-ins to make today yours.'}
      </p>

      <div className="wc-progress">
        <div className="wc-bar"><div className="wc-fill" style={{ width: `${pct}%` }} /></div>
        <span className="wc-count">{doneCount}/{STEPS.length}</span>
      </div>

      <ul className="wc-list">
        {STEPS.map((s) => {
          const done = s.done(day);
          return (
            <li key={s.id}>
              <button className={`wc-step ${done ? 'done' : ''}`} onClick={() => !done && onJump(s.target)} disabled={done}>
                <span className={`wc-tick ${done ? 'on' : ''}`} aria-hidden="true">
                  {done ? <IconCheck size={13} /> : <span className="wc-emoji">{s.emoji}</span>}
                </span>
                <span className="wc-label">{s.label}</span>
                {!done && <span className="wc-go" aria-hidden="true">›</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {allDone && <button className="wc-done-btn" onClick={onDismiss}>Done</button>}

      <style>{`
        .welcome-card { background: linear-gradient(150deg, color-mix(in srgb, var(--amber-100) 70%, var(--surface)), var(--surface));
          border: 1px solid color-mix(in srgb, var(--amber-300) 60%, var(--border)); border-radius: var(--r-lg);
          padding: var(--s-5); box-shadow: var(--shadow-xs); animation: rise var(--dur-slow) var(--ease-out) both; }
        .wc-head { display: flex; align-items: center; justify-content: space-between; }
        .wc-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-weight: 600;
          font-size: 1.1rem; color: var(--text); }
        .wc-title svg { color: var(--amber-600); }
        .wc-skip { font-size: var(--t-xs); font-weight: 600; color: var(--text-soft); padding: 4px 8px; border-radius: var(--r-sm); }
        .wc-skip:hover { color: var(--text); background: var(--surface-soft); }
        .wc-sub { font-size: var(--t-sm); color: var(--text-soft); margin: 4px 0 14px; }
        .wc-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .wc-bar { flex: 1; height: 7px; border-radius: 99px; background: color-mix(in srgb, var(--amber-200) 60%, var(--surface)); overflow: hidden; }
        .wc-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--amber-400), var(--amber-600));
          transition: width var(--dur-slow) var(--ease-spring); }
        .wc-count { font-size: var(--t-xs); font-weight: 700; color: var(--amber-700); font-variant-numeric: tabular-nums; }
        .wc-list { display: flex; flex-direction: column; gap: 7px; list-style: none; padding: 0; margin: 0; }
        .wc-step { display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; padding: 9px 11px;
          border-radius: var(--r-md); background: var(--surface); border: 1px solid var(--border);
          transition: transform var(--dur-fast) var(--ease-spring), border-color var(--dur-fast), box-shadow var(--dur-fast); }
        .wc-step:not(.done):hover { border-color: var(--amber-400); box-shadow: var(--shadow-xs); }
        .wc-step:not(.done):active { transform: scale(0.99); }
        .wc-step.done { background: color-mix(in srgb, var(--good) 9%, var(--surface)); border-color: color-mix(in srgb, var(--good) 32%, var(--border)); }
        .wc-tick { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
          background: var(--surface-soft); }
        .wc-tick.on { background: var(--good); color: #fff; }
        .wc-emoji { font-size: 0.95rem; line-height: 1; }
        .wc-label { flex: 1; font-size: var(--t-sm); font-weight: 600; color: var(--text); }
        .wc-step.done .wc-label { color: var(--text-soft); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--good) 50%, transparent); }
        .wc-go { flex-shrink: 0; font-size: 1.15rem; font-weight: 700; color: var(--amber-600); opacity: 0.7; line-height: 1; }
        .wc-done-btn { margin-top: 14px; width: 100%; padding: 11px; border-radius: var(--r-md); font-weight: 700;
          color: #fff; background: linear-gradient(135deg, var(--amber-500), var(--amber-600)); }
        .wc-done-btn:hover { box-shadow: 0 8px 26px rgba(232,148,20,0.36); }
      `}</style>
    </div>
  );
}
