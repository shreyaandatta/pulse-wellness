import { useState, useRef } from 'react';
import { IconFire, IconPlus, IconTrash } from './Icons.jsx';
import { useGoalCelebration } from '../hooks/useGoalCelebration.js';

const TYPES = [
  { t: 'Run', e: '🏃' }, { t: 'Strength', e: '🏋️' }, { t: 'Yoga', e: '🧘' },
  { t: 'Walk', e: '🚶' }, { t: 'Cycle', e: '🚴' }, { t: 'Swim', e: '🏊' },
  { t: 'HIIT', e: '⚡' }, { t: 'Sport', e: '🎾' },
];

export default function WorkoutCard({ day, dayKey, goals, onAdd, onRemove, notify }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('Run');
  const [minutes, setMinutes] = useState(30);
  const [intensity, setIntensity] = useState(2);
  const cardRef = useRef(null);

  const total = day.workouts.reduce((s, w) => s + (w.minutes || 0), 0);
  const pct = Math.min(100, (total / Math.max(1, goals.activeMinutes)) * 100);
  const reached = total >= goals.activeMinutes;

  useGoalCelebration(reached, dayKey, cardRef, () => notify('Movement goal hit!', '🎉'));

  const save = () => {
    onAdd({ type, minutes: Number(minutes) || 0, intensity });
    notify(`Logged ${minutes}m ${type}`, '🔥');
    setOpen(false); setMinutes(30); setIntensity(2);
  };

  return (
    <div className="card" ref={cardRef}>
      <div className="card-title"><span className="dot" style={{ background: 'var(--clay)' }} /><IconFire size={15} /> Movement</div>

      <div className="row-between">
        <div>
          <span className="stat-big" key={total} style={{ display: 'inline-block', animation: 'popIn .35s var(--ease-spring)' }}>{total}</span> <span className="stat-unit">min active</span>
          <div className="faint">goal {goals.activeMinutes} min</div>
          {reached && <div className="reached">🎉 Goal reached!</div>}
        </div>
        <button className="round-btn accent" onClick={() => setOpen((o) => !o)} aria-label="Add workout">
          <IconPlus size={20} />
        </button>
      </div>

      <div className="progress-track" style={{ marginTop: 12 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--amber-400), var(--clay))' }} />
      </div>

      {open && (
        <div className="form pop" style={{ marginTop: 16 }}>
          <div className="type-grid">
            {TYPES.map((x) => (
              <button key={x.t} className={`chip ${type === x.t ? 'active' : ''}`} onClick={() => setType(x.t)}>
                {x.e} {x.t}
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Minutes — {minutes}</label>
            <input className="input" type="range" min="5" max="120" step="5" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Intensity</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Easy', 'Moderate', 'Hard'].map((lbl, i) => (
                <button key={lbl} className={`chip ${intensity === i + 1 ? 'active' : ''}`} onClick={() => setIntensity(i + 1)}>{lbl}</button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={save}>Add workout</button>
        </div>
      )}

      {day.workouts.length > 0 && (
        <div className="log-list">
          {day.workouts.map((w) => (
            <div className="log-item pop" key={w.id}>
              <span>{TYPES.find((t) => t.t === w.type)?.e || '💪'} {w.type}</span>
              <span className="faint">{w.minutes}m · {['Easy','Mod','Hard'][w.intensity-1] || ''}</span>
              <button className="del" onClick={() => onRemove(w.id)} aria-label="Remove"><IconTrash size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .row-between { display: flex; align-items: flex-start; justify-content: space-between; }
        .type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .type-grid .chip { justify-content: center; padding: 9px 4px; font-size: var(--t-xs); }
        .log-list { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
        .log-item { display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 10px 12px; border-radius: var(--r-md); background: var(--surface-soft); font-weight: 600; font-size: var(--t-sm); }
        .log-item .faint { margin-left: auto; }
        .del { color: var(--text-faint); padding: 4px; border-radius: 8px; transition: color var(--dur), transform var(--dur-fast); }
        .del:hover { color: var(--bad); transform: scale(1.15); }
      `}</style>
    </div>
  );
}
