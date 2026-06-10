import { useEffect, useRef, useState } from 'react';
import { dayScore, pillarScores, scoreBand, PILLAR_META } from '../lib/score.js';
import { useGoalCelebration } from '../hooks/useGoalCelebration.js';
import { celebrate } from '../lib/celebrate.js';

// Animated count-up + ring draw.
function useCountUp(target, dur = 900) {
  const [val, setVal] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    cancelAnimationFrame(ref.current);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, dur]);
  return val;
}

export default function WellnessRing({ day, dayKey, goals, notify }) {
  const score = dayScore(day, goals);
  const pillars = pillarScores(day, goals);
  const band = scoreBand(score);
  const shown = useCountUp(score);
  const cardRef = useRef(null);

  // Crossing into "Thriving" (80+) earns the biggest celebration of the day.
  useGoalCelebration(score >= 80, dayKey, cardRef, () => {
    setTimeout(() => celebrate(cardRef.current, 36), 250);
    notify?.('Thriving — what a day! 🌟', '🏆');
  });

  const R = 78, C = 2 * Math.PI * R;
  const offset = C * (1 - score / 100);

  return (
    <div className="card score-card" ref={cardRef}>
      <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} />Daily Wellness</div>

      <div className="ring-wrap">
        <svg width="200" height="200" viewBox="0 0 200 200" className="ring-svg">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--honey-400)" />
              <stop offset="55%" stopColor="var(--amber-500)" />
              <stop offset="100%" stopColor="var(--clay)" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r={R} fill="none" stroke="var(--surface-soft)" strokeWidth="16" />
          <circle
            cx="100" cy="100" r={R} fill="none"
            stroke="url(#ringGrad)" strokeWidth="16" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={offset}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 1s var(--ease-out)' }}
          />
        </svg>
        <div className="ring-center">
          <div className="ring-score">{shown}</div>
          <div className="ring-band" style={{ color: band.color }}>{band.emoji} {band.label}</div>
        </div>
      </div>

      <div className="pillars">
        {Object.entries(pillars).map(([k, v]) => (
          <div className="pillar" key={k} title={`${PILLAR_META[k].label}: ${Math.round(v * 100)}%`}>
            <div className="pillar-bar">
              <div className="pillar-fill" style={{ height: `${Math.max(6, v * 100)}%`, background: PILLAR_META[k].color }} />
            </div>
            <span className="pillar-ico">{PILLAR_META[k].icon}</span>
          </div>
        ))}
      </div>

      <style>{`
        .score-card { display: flex; flex-direction: column; align-items: center; }
        .ring-wrap { position: relative; width: 200px; height: 200px; margin: 4px 0 var(--s-5); }
        .ring-svg { display: block; }
        .ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
        .ring-score { font-family: var(--font-display); font-weight: 600; font-size: 3.4rem; line-height: 1; letter-spacing: -0.03em; }
        .ring-band { font-size: var(--t-sm); font-weight: 700; }
        .pillars { display: flex; gap: var(--s-4); align-items: flex-end; width: 100%; justify-content: center; }
        .pillar { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .pillar-bar { width: 12px; height: 56px; border-radius: var(--r-pill); background: var(--surface-soft); display: flex; align-items: flex-end; overflow: hidden; }
        .pillar-fill { width: 100%; border-radius: var(--r-pill); transition: height 1s var(--ease-out); }
        .pillar-ico { font-size: 0.95rem; }
      `}</style>
    </div>
  );
}
