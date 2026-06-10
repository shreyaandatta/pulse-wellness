import { useRef } from 'react';
import { IconShoe } from './Icons.jsx';
import { useGoalCelebration } from '../hooks/useGoalCelebration.js';

export default function StepsCard({ day, dayKey, goals, onAdd, onSet, notify }) {
  const cardRef = useRef(null);
  const pct = Math.min(100, (day.steps / Math.max(1, goals.steps)) * 100);
  const reached = day.steps >= goals.steps;

  useGoalCelebration(reached, dayKey, cardRef, () => notify('Step goal smashed!', '🎉'));

  return (
    <div className="card" ref={cardRef}>
      <div className="card-title"><span className="dot" style={{ background: 'var(--amber-600)' }} /><IconShoe size={15} /> Steps</div>
      <div className="row-between">
        <div>
          <span className="stat-big" key={day.steps} style={{ animation: 'popIn .35s var(--ease-spring)' }}>{day.steps.toLocaleString()}</span>
          <div className="faint">goal {goals.steps.toLocaleString()}</div>
          {reached && <div className="reached">🎉 Goal reached!</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="chip" onClick={() => { onAdd(1000); notify('+1,000 steps', '👟'); }}>+1k</button>
          <button className="chip" onClick={() => { onAdd(2500); notify('+2,500 steps', '👟'); }}>+2.5k</button>
        </div>
      </div>
      <input className="input" type="range" min="0" max="20000" step="500" value={day.steps}
        onChange={(e) => onSet(Number(e.target.value))} style={{ marginTop: 12, accentColor: 'var(--amber-500)', height: 8 }} />
      <div className="progress-track" style={{ marginTop: 10 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--amber-400), var(--amber-600))' }} />
      </div>
    </div>
  );
}
