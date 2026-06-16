import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { waterIncrements, waterCurrentLabel, glassMl } from '../lib/units.js';
import { IconX } from './Icons.jsx';

// The everyday quick-log sheet. A floating button (bottom-right) opens a small
// sheet that logs the highest-frequency things — water, steps, mood — in one
// tap, from ANY screen, without scrolling to the right card. Meals and sleep
// (which need richer input) jump to their full cards on Today instead.
//
// Everything here logs TODAY (via the addToday* actions), never the past day a
// user might be reviewing in the Day switcher.

const MOODS = [
  { v: 1, e: '😔', label: 'Low' },
  { v: 2, e: '😕', label: 'Meh' },
  { v: 3, e: '😊', label: 'Okay' },
  { v: 4, e: '😄', label: 'Good' },
  { v: 5, e: '🤩', label: 'Great' },
];

const STEP_ADDS = [1000, 2000, 5000];

export default function QuickLog({ today, goals, units, onWater, onSteps, onMood, onJump, notify, openSignal = 0 }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  // Open from an app-icon shortcut (?log=…) — App bumps openSignal.
  useEffect(() => { if (openSignal > 0) setOpen(true); }, [openSignal]);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const water = today.water || 0;
  const steps = today.steps || 0;
  const mood = today.mood ?? null;

  const addWater = (ml, label) => { onWater(ml); notify(`+${label} water`, '💧'); };
  const addSteps = (n) => { onSteps(n); notify(`+${n.toLocaleString()} steps`, '👟'); };
  const pickMood = (m) => { onMood(m.v); notify(`Mood: ${m.label}`, m.e); };
  const jump = (id) => { setOpen(false); onJump(id); };

  return (
    <>
      <button className="ql-fab" onClick={() => setOpen(true)} aria-label="Quick log">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className="ql-fab-lbl">Log</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="ql-scrim" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            />
            <motion.div
              className="ql-sheet" role="dialog" aria-label="Quick log"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            >
              <div className="ql-head">
                <h3>Quick log</h3>
                <button className="ql-x" onClick={() => setOpen(false)} aria-label="Close"><IconX size={18} /></button>
              </div>

              {/* Water */}
              <div className="ql-group">
                <div className="ql-grp-head"><span>💧 Water</span><span className="ql-now">{waterCurrentLabel(water, units)}{goals.water ? ` / ${waterCurrentLabel(goals.water, units)}` : ''}</span></div>
                <div className="ql-row">
                  <button className="ql-chip" onClick={() => addWater(glassMl(units), '1 glass')}>+1 glass</button>
                  {waterIncrements(units).map((inc) => (
                    <button key={inc.ml} className="ql-chip" onClick={() => addWater(inc.ml, inc.label)}>+{inc.label}</button>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="ql-group">
                <div className="ql-grp-head"><span>👟 Steps</span><span className="ql-now">{steps.toLocaleString()}{goals.steps ? ` / ${goals.steps.toLocaleString()}` : ''}</span></div>
                <div className="ql-row">
                  {STEP_ADDS.map((n) => (
                    <button key={n} className="ql-chip" onClick={() => addSteps(n)}>+{n.toLocaleString()}</button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div className="ql-group">
                <div className="ql-grp-head"><span>🌤️ Mood</span>{mood != null && <span className="ql-now">{MOODS[mood - 1].label}</span>}</div>
                <div className="ql-row ql-moods">
                  {MOODS.map((m) => (
                    <button key={m.v} className={`ql-mood ${mood === m.v ? 'on' : ''}`} onClick={() => pickMood(m)} aria-label={m.label}>{m.e}</button>
                  ))}
                </div>
              </div>

              {/* Richer logs jump to their full cards */}
              <div className="ql-jumps">
                <button className="ql-jump" onClick={() => jump('meal')}>🥗 Log a meal <span className="ql-arr">›</span></button>
                <button className="ql-jump" onClick={() => jump('sleep')}>🌙 Log sleep <span className="ql-arr">›</span></button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .ql-fab {
          position: fixed; right: 16px; z-index: 35;
          bottom: calc(86px + env(safe-area-inset-bottom));
          display: flex; align-items: center; gap: 7px;
          height: 52px; padding: 0 18px 0 15px; border-radius: var(--r-pill);
          background: linear-gradient(140deg, var(--amber-400), var(--amber-600));
          color: #fff; font-weight: 700; font-size: var(--t-base);
          box-shadow: var(--shadow-glow), 0 6px 18px rgba(120, 80, 30, 0.22);
          transition: transform var(--dur-fast) var(--ease-spring), box-shadow var(--dur);
        }
        .ql-fab svg { width: 20px; height: 20px; }
        .ql-fab-lbl { letter-spacing: -0.01em; }
        .ql-fab:hover { transform: translateY(-2px); }
        .ql-fab:active { transform: scale(0.94); }
        @media (min-width: 760px) { .ql-fab { right: 28px; bottom: 28px; height: 56px; } }

        .ql-scrim { position: fixed; inset: 0; z-index: 50;
          background: color-mix(in srgb, var(--ink-900) 26%, transparent);
          backdrop-filter: blur(3px); }
        .ql-sheet {
          position: fixed; z-index: 51;
          left: 12px; right: 12px; bottom: calc(16px + env(safe-area-inset-bottom));
          padding: 16px 16px 18px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--r-xl); box-shadow: var(--shadow-lg);
          transform-origin: bottom center;
        }
        @media (min-width: 760px) {
          .ql-sheet { left: auto; right: 28px; bottom: 96px; width: 360px; transform-origin: bottom right; }
        }
        .ql-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .ql-head h3 { font-family: var(--font-display); font-weight: 600; font-size: var(--t-lg); }
        .ql-x { width: 34px; height: 34px; display: grid; place-items: center; border-radius: var(--r-md);
          color: var(--text-soft); transition: background var(--dur-fast); }
        .ql-x:hover { background: var(--surface-soft); }

        .ql-group { margin-top: 14px; }
        .ql-grp-head { display: flex; align-items: baseline; justify-content: space-between;
          font-size: var(--t-sm); font-weight: 700; color: var(--text); margin-bottom: 8px; }
        .ql-now { font-weight: 600; color: var(--text-faint); font-size: var(--t-xs); }
        .ql-row { display: flex; gap: 8px; }
        .ql-chip {
          flex: 1; min-height: 44px; padding: 8px 6px; border-radius: var(--r-md);
          background: var(--surface-soft); border: 1px solid var(--border);
          font-weight: 700; font-size: var(--t-sm); color: var(--text);
          transition: transform var(--dur-fast) var(--ease-spring), background var(--dur), border-color var(--dur);
        }
        .ql-chip:hover { border-color: var(--amber-400); }
        .ql-chip:active { transform: scale(0.93); background: var(--amber-100); }

        .ql-moods { gap: 6px; }
        .ql-mood { flex: 1; min-height: 48px; font-size: 1.5rem; border-radius: var(--r-md);
          border: 1px solid var(--border); background: var(--surface-soft);
          filter: grayscale(0.4); transition: all var(--dur) var(--ease-spring); }
        .ql-mood:hover { filter: none; transform: translateY(-2px); }
        .ql-mood.on { filter: none; transform: scale(1.08); background: linear-gradient(135deg, #FBE3EA, #F6D0DB); border-color: var(--rose); }

        .ql-jumps { display: flex; flex-direction: column; gap: 8px; margin-top: 16px;
          padding-top: 14px; border-top: 1px solid var(--border); }
        .ql-jump { display: flex; align-items: center; gap: 8px; min-height: 46px; padding: 10px 14px;
          border-radius: var(--r-md); background: var(--surface-soft); border: 1px solid var(--border);
          font-weight: 600; font-size: var(--t-base); color: var(--text); text-align: left;
          transition: background var(--dur-fast); }
        .ql-jump:hover { background: var(--amber-100); }
        .ql-arr { margin-left: auto; color: var(--text-faint); font-size: 1.2rem; font-weight: 700; }
      `}</style>
    </>
  );
}
