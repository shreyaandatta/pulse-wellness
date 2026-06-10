import { useState, useRef } from 'react';
import { IconLeaf, IconPlus, IconTrash } from './Icons.jsx';
import { useGoalCelebration } from '../hooks/useGoalCelebration.js';

const MEAL_TYPES = [
  { t: 'Breakfast', e: '🍳' }, { t: 'Lunch', e: '🥗' },
  { t: 'Dinner', e: '🍲' }, { t: 'Snack', e: '🍎' },
];

export default function MealCard({ day, dayKey, goals, onAdd, onRemove, notify }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('Breakfast');
  const [label, setLabel] = useState('');
  const [quality, setQuality] = useState(4);
  const cardRef = useRef(null);

  const count = day.meals.length;
  const pct = Math.min(100, (count / Math.max(1, goals.meals)) * 100);
  const reached = count >= goals.meals;

  useGoalCelebration(reached, dayKey, cardRef, () => notify('All meals logged!', '🎉'));

  const save = () => {
    onAdd({ type, label: label.trim() || type, quality });
    notify(`Logged ${type}`, '🥗');
    setOpen(false); setLabel(''); setQuality(4);
  };

  return (
    <div className="card" ref={cardRef}>
      <div className="card-title"><span className="dot" style={{ background: 'var(--sage)' }} /><IconLeaf size={15} /> Nutrition</div>

      <div className="row-between">
        <div>
          <span className="stat-big" key={count} style={{ display: 'inline-block', animation: 'popIn .35s var(--ease-spring)' }}>{count}</span> <span className="stat-unit">meals</span>
          <div className="faint">goal {goals.meals} meals</div>
          {reached && <div className="reached">🎉 Goal reached!</div>}
        </div>
        <button className="round-btn accent" onClick={() => setOpen((o) => !o)} aria-label="Add meal"><IconPlus size={20} /></button>
      </div>

      <div className="progress-track" style={{ marginTop: 12 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--honey-400), var(--sage))' }} />
      </div>

      {open && (
        <div className="form pop" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MEAL_TYPES.map((x) => (
              <button key={x.t} className={`chip ${type === x.t ? 'active' : ''}`} onClick={() => setType(x.t)}>{x.e} {x.t}</button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>What did you have? (optional)</label>
            <input className="input" value={label} placeholder="e.g. Oats & berries" onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()} />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>How nourishing?</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map((q) => (
                <button key={q} className={`q-dot ${quality >= q ? 'on' : ''}`} onClick={() => setQuality(q)} aria-label={`quality ${q}`} />
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={save}>Add meal</button>
        </div>
      )}

      {count > 0 && (
        <div className="log-list">
          {day.meals.map((m) => (
            <div className="log-item pop" key={m.id}>
              <span>{MEAL_TYPES.find((t) => t.t === m.type)?.e || '🍽️'} {m.label}</span>
              <span className="faint">{'●'.repeat(m.quality)}</span>
              <button className="del" onClick={() => onRemove(m.id)} aria-label="Remove"><IconTrash size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .q-dot { width: 30px; height: 30px; border-radius: 50%; background: var(--surface-soft);
          border: 1px solid var(--border); transition: all var(--dur) var(--ease-spring); }
        .q-dot.on { background: linear-gradient(135deg, var(--sage), #9CC299); border-color: var(--sage); transform: scale(1.05); }
        .log-item .faint { margin-left: auto; letter-spacing: 1px; color: var(--sage); }
      `}</style>
    </div>
  );
}
