import { useRef } from 'react';
import { useGoalCelebration } from '../hooks/useGoalCelebration.js';

// A user-defined tracker (Plus) — one generic counter card that behaves like
// the built-in pillars: tap to log, progress to a daily goal, confetti on it.
export default function CustomCard({ tracker, day, dayKey, onAdd, notify }) {
  const cardRef = useRef(null);
  const value = day.custom?.[tracker.id] || 0;
  const goal = Math.max(1, tracker.goal || 1);
  const step = tracker.step || 1;
  const pct = Math.min(100, (value / goal) * 100);
  const reached = value >= goal;

  useGoalCelebration(reached, dayKey, cardRef, () => notify(`${tracker.name} goal reached!`, tracker.emoji || '⭐'));

  return (
    <div className="card" ref={cardRef}>
      <div className="card-title">
        <span className="dot" style={{ background: 'var(--clay)' }} />
        <span>{tracker.emoji || '⭐'}</span> {tracker.name}
      </div>
      <div className="row-between">
        <div>
          <span className="stat-big" key={value} style={{ animation: 'popIn .35s var(--ease-spring)' }}>
            {value.toLocaleString()}{tracker.unit ? <span className="cc-unit"> {tracker.unit}</span> : null}
          </span>
          <div className="faint">goal {goal.toLocaleString()}{tracker.unit ? ` ${tracker.unit}` : ''}</div>
          {reached && <div className="reached">🎉 Goal reached!</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="chip" onClick={() => onAdd(tracker.id, -step)} aria-label={`Remove ${step}`}>−{step}</button>
          <button className="chip" onClick={() => { onAdd(tracker.id, step); notify(`+${step} ${tracker.name}`, tracker.emoji || '⭐'); }}>+{step}</button>
        </div>
      </div>
      <div className="progress-track" style={{ marginTop: 14 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--amber-400), var(--clay))' }} />
      </div>
      <style>{`.cc-unit { font-size: 0.85rem; color: var(--text-soft); font-family: var(--font-sans); font-weight: 600; }`}</style>
    </div>
  );
}
