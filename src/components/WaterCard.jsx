import { useState, useRef } from 'react';
import { IconDrop } from './Icons.jsx';
import { waterIncrements, waterCurrentLabel, waterGoalLabel } from '../lib/units.js';
import { useGoalCelebration } from '../hooks/useGoalCelebration.js';

export default function WaterCard({ day, dayKey, goals, units, onAdd, notify }) {
  const [bump, setBump] = useState(0);
  const cardRef = useRef(null);
  const pct = Math.min(100, (day.water / Math.max(1, goals.water)) * 100);
  const incs = waterIncrements(units);
  const reached = day.water >= goals.water;

  useGoalCelebration(reached, dayKey, cardRef, () => notify('Hydration goal reached!', '🎉'));

  const add = (ml, label) => {
    onAdd(ml);
    setBump((b) => b + 1);
    notify(`+${label} water`, '💧');
  };

  return (
    <div className="card water-card" ref={cardRef}>
      <div className="card-title"><span className="dot" style={{ background: 'var(--water)' }} /><IconDrop size={15} /> Hydration</div>

      <div className="water-body">
        <div className="bottle">
          <div className="bottle-fill" style={{ height: `${pct}%` }}>
            <div className="wave" />
          </div>
          <div className="bottle-pct">{Math.round(pct)}%</div>
        </div>

        <div className="water-meta">
          <div>
            <span className="stat-big" key={bump} style={{ animation: 'popIn .35s var(--ease-spring)' }}>
              {waterCurrentLabel(day.water, units)}
            </span>
          </div>
          <div className="faint">of {waterGoalLabel(goals.water, units)} goal</div>
          {reached && <div className="reached">🎉 Goal reached!</div>}

          <div className="water-btns">
            {incs.map((i) => (
              <button key={i.ml} className="chip" onClick={() => add(i.ml, i.label)}>+ {i.label}</button>
            ))}
            <button className="chip undo" onClick={() => { onAdd(-incs[0].ml); notify(`−${incs[0].label} water`, '↩️'); }} disabled={day.water === 0}>−</button>
          </div>
        </div>
      </div>

      <style>{`
        .water-body { display: flex; gap: var(--s-5); align-items: center; }
        .bottle { position: relative; width: 64px; height: 120px; border-radius: 18px 18px 22px 22px;
          background: var(--surface-soft); border: 1px solid var(--border); overflow: hidden; flex-shrink: 0; }
        .bottle::before { content: ''; position: absolute; top: -7px; left: 50%; transform: translateX(-50%);
          width: 26px; height: 12px; border-radius: 5px; background: var(--surface-soft); border: 1px solid var(--border); }
        .bottle-fill { position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(180deg, #6FC7DE, var(--water));
          transition: height .7s var(--ease-out); }
        .wave { position: absolute; top: -6px; left: 0; right: 0; height: 10px;
          background: radial-gradient(circle at 50% 100%, rgba(255,255,255,.5), transparent 70%); }
        .bottle-pct { position: absolute; inset: 0; display: grid; place-items: center;
          font-weight: 700; font-size: var(--t-sm); color: var(--ink-900); mix-blend-mode: hard-light; }
        .water-meta { flex: 1; }
        .water-btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: var(--s-4); }
        .water-btns .undo { width: 40px; justify-content: center; }
      `}</style>
    </div>
  );
}
