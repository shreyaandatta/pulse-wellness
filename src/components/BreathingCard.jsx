import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { celebrate } from '../lib/celebrate.js';
import { celebrateFeedback } from '../lib/feedback.js';

// A calm-down tool: guided box breathing (in 4 · hold 4 · out 4 · hold 4).
// The card lives on Today; tapping Start opens a full-screen player. Finishing
// a session logs it for the day so it can show up in your record.

const PHASES = [
  { id: 'in',    label: 'Breathe in', dur: 4000, scale: 1 },
  { id: 'hold1', label: 'Hold',       dur: 4000, scale: 1 },
  { id: 'out',   label: 'Breathe out', dur: 4000, scale: 0.42 },
  { id: 'hold2', label: 'Hold',       dur: 4000, scale: 0.42 },
];
const ROUNDS = 4; // ≈ 64s — a one-minute reset

export default function BreathingCard({ day, onComplete, notify }) {
  const [open, setOpen] = useState(false);
  const today = day.calm || 0;

  const finish = (completed) => {
    setOpen(false);
    if (completed) { onComplete(); notify('Calm session logged', '🫧'); }
  };

  return (
    <div className="card breathe-card">
      <div className="card-title"><span className="dot" style={{ background: 'var(--plum)' }} /> 🫧 Breathe</div>
      <div className="breathe-body">
        <div className="breathe-orb" aria-hidden="true"><span /><span /><span /></div>
        <div className="breathe-meta">
          <p className="breathe-lead">A one-minute reset. Follow the circle — in, hold, out, hold.</p>
          <div className="breathe-row">
            <button className="btn btn-sm btn-primary" onClick={() => setOpen(true)}>Start breathing</button>
            {today > 0 && <span className="breathe-count">🫧 {today} today</span>}
          </div>
        </div>
      </div>

      {open && <BreathingPlayer onFinish={finish} />}

      <style>{`
        .breathe-body { display: flex; gap: var(--s-5); align-items: center; }
        .breathe-orb { position: relative; width: 70px; height: 70px; flex-shrink: 0; display: grid; place-items: center; }
        .breathe-orb span { position: absolute; inset: 0; margin: auto; border-radius: 50%;
          background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--plum) 70%, white), var(--plum));
          opacity: .25; animation: breatheOrb 8s var(--ease-in-out, ease-in-out) infinite; }
        .breathe-orb span:nth-child(1) { width: 70px; height: 70px; }
        .breathe-orb span:nth-child(2) { width: 50px; height: 50px; animation-delay: .25s; opacity: .4; }
        .breathe-orb span:nth-child(3) { width: 30px; height: 30px; animation-delay: .5s; opacity: .85; }
        @keyframes breatheOrb { 0%,100% { transform: scale(.7); } 50% { transform: scale(1.05); } }
        .breathe-meta { flex: 1; }
        .breathe-lead { color: var(--text-soft); font-size: var(--t-sm); margin: 0 0 12px; line-height: 1.5; }
        .breathe-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .breathe-count { font-size: var(--t-xs); font-weight: 700; color: var(--plum); }
        @media (prefers-reduced-motion: reduce) { .breathe-orb span { animation: none; } }
      `}</style>
    </div>
  );
}

function BreathingPlayer({ onFinish }) {
  const total = PHASES.length * ROUNDS;
  const [step, setStep] = useState(0);
  const done = step >= total;
  const celebrated = useRef(false);

  useEffect(() => {
    if (done) {
      if (!celebrated.current) { celebrated.current = true; celebrate(null, 26); celebrateFeedback(); }
      const t = setTimeout(() => onFinish(true), 1500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), PHASES[step % PHASES.length].dur);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const phase = PHASES[step % PHASES.length];
  const round = Math.min(ROUNDS, Math.floor(step / PHASES.length) + 1);

  // Portal to <body> so the full-screen overlay escapes any transformed
  // ancestor (the Today panes animate with transforms, which would otherwise
  // trap a position:fixed child inside the page instead of the viewport).
  return createPortal((
    <div className="breathe-stage" role="dialog" aria-label="Breathing exercise">
      <button className="bp-close" onClick={() => onFinish(false)} aria-label="Close">✕</button>

      <div className="bp-center">
        <div className="bp-circle-wrap">
          <div
            className="bp-circle"
            style={{ transform: `scale(${done ? 0.7 : phase.scale})`, transitionDuration: `${done ? 900 : phase.dur}ms` }}
          />
          <div className="bp-word">{done ? 'Done 🌿' : phase.label}</div>
        </div>

        {!done ? (
          <>
            <div className="bp-rounds">
              {Array.from({ length: ROUNDS }).map((_, i) => (
                <span key={i} className={`bp-dot ${i < round ? 'on' : ''}`} />
              ))}
            </div>
            <div className="bp-hint">Round {round} of {ROUNDS}</div>
            <button className="bp-finish" onClick={() => onFinish(true)}>Finish &amp; log</button>
          </>
        ) : (
          <div className="bp-hint">That's a calm session logged. 🫧</div>
        )}
      </div>

      <style>{`
        .breathe-stage { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center;
          background: radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, var(--plum) 26%, var(--bg)), var(--bg));
          animation: fadeIn .3s var(--ease-out); }
        .bp-close { position: absolute; top: max(18px, env(safe-area-inset-top)); right: 18px; width: 40px; height: 40px;
          border-radius: 50%; border: 1px solid var(--border); background: var(--surface); color: var(--text-soft);
          font-size: 16px; cursor: pointer; }
        .bp-center { display: flex; flex-direction: column; align-items: center; gap: 22px; }
        .bp-circle-wrap { position: relative; width: 280px; height: 280px; display: grid; place-items: center; }
        .bp-circle { width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--plum) 55%, white), var(--plum));
          box-shadow: 0 0 60px color-mix(in srgb, var(--plum) 45%, transparent);
          transition-property: transform; transition-timing-function: cubic-bezier(.37,0,.63,1); }
        .bp-word { position: absolute; inset: 0; display: grid; place-items: center;
          font-family: var(--font-display); font-weight: 600; font-size: 1.5rem; color: #fff;
          letter-spacing: .01em; text-shadow: 0 1px 8px rgba(0,0,0,.25); }
        .bp-rounds { display: flex; gap: 9px; }
        .bp-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--border);
          transition: background .3s, transform .3s; }
        .bp-dot.on { background: var(--plum); transform: scale(1.15); }
        .bp-hint { font-size: var(--t-sm); color: var(--text-soft); font-weight: 600; }
        .bp-finish { margin-top: 4px; padding: 9px 20px; border-radius: var(--r-pill); cursor: pointer;
          border: 1px solid var(--border); background: var(--surface); color: var(--text);
          font-weight: 600; font-size: var(--t-sm); }
        .bp-finish:active { transform: scale(.97); }
        @media (prefers-reduced-motion: reduce) { .bp-circle { transition-duration: .2s !important; } }
      `}</style>
    </div>
  ), document.body);
}
