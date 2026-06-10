import { useRef } from 'react';
import { IconMoon } from './Icons.jsx';
import { useGoalCelebration } from '../hooks/useGoalCelebration.js';

export default function SleepCard({ day, dayKey, goals, onSet, notify }) {
  const hours = day.sleep ?? 0;
  const cardRef = useRef(null);
  const set = (h) => {
    onSet(+h.toFixed(1), day.sleepQuality);
    if (h > 0) notify(`Sleep set to ${h.toFixed(1)}h`, '🌙');
  };
  const setQ = (q) => onSet(day.sleep ?? goals.sleep, q);
  const pct = Math.min(100, (hours / Math.max(1, goals.sleep)) * 100);
  const reached = hours >= goals.sleep;

  useGoalCelebration(reached, dayKey, cardRef, () => notify('Sleep goal met — well rested!', '🎉'));

  return (
    <div className="card" ref={cardRef}>
      <div className="card-title"><span className="dot" style={{ background: 'var(--plum)' }} /><IconMoon size={15} /> Sleep</div>

      <div className="sleep-readout">
        <span className="stat-big">{hours ? hours.toFixed(1) : '—'}</span>
        <span className="stat-unit">hrs</span>
        <span className="faint" style={{ marginLeft: 'auto' }}>goal {goals.sleep}h</span>
      </div>

      <input className="input sleep-range" type="range" min="0" max="12" step="0.5"
        value={hours} onChange={(e) => set(Number(e.target.value))} />
      <div className="scale-marks"><span>0</span><span>{goals.sleep}</span><span>12</span></div>

      <div className="progress-track" style={{ marginTop: 10 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--plum), #B79BD0)' }} />
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label>Sleep quality</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['😴','Poor'],['😐','Ok'],['🙂','Good'],['😌','Great'],['🤩','Best']].map(([e, lbl], i) => (
            <button key={lbl} className={`chip ${day.sleepQuality === i + 1 ? 'active' : ''}`} onClick={() => setQ(i + 1)}
              style={{ flexDirection: 'column', flex: 1, gap: 2, padding: '8px 2px' }}>
              <span style={{ fontSize: '1.1rem' }}>{e}</span>
              <span style={{ fontSize: '0.62rem' }}>{lbl}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .sleep-readout { display: flex; align-items: baseline; gap: 6px; margin-bottom: 10px; }
        .sleep-range { accent-color: var(--plum); padding: 0; height: 8px; }
        .scale-marks { display: flex; justify-content: space-between; font-size: var(--t-xs); color: var(--text-faint); margin-top: 4px; }
      `}</style>
    </div>
  );
}
