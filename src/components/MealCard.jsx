import { useState, useRef } from 'react';
import { IconLeaf, IconPlus, IconTrash } from './Icons.jsx';
import { useGoalCelebration } from '../hooks/useGoalCelebration.js';
import { searchFoods, makeFood, foodToMeal, dayCalories } from '../lib/foods.js';

const MEAL_TYPES = [
  { t: 'Breakfast', e: '🍳' }, { t: 'Lunch', e: '🥗' },
  { t: 'Dinner', e: '🍲' }, { t: 'Snack', e: '🍎' },
];

export default function MealCard({ day, dayKey, goals, foods, onAdd, onAddFood, onRemove, notify }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('Breakfast');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false); // custom-food form open?
  const cardRef = useRef(null);

  const count = day.meals.length;
  const pct = Math.min(100, (count / Math.max(1, goals.meals)) * 100);
  const reached = count >= goals.meals;
  const kcal = dayCalories(day);

  useGoalCelebration(reached, dayKey, cardRef, () => notify('All meals logged!', '🎉'));

  const results = searchFoods(query, foods).slice(0, 8);

  const reset = () => { setOpen(false); setCreating(false); setQuery(''); };

  const logFood = (food) => {
    onAdd(foodToMeal(food, type));
    notify(`${food.emoji} ${food.name} · ${type}`, '🥗');
    reset();
  };

  return (
    <div className="card" ref={cardRef}>
      <div className="card-title"><span className="dot" style={{ background: 'var(--sage)' }} /><IconLeaf size={15} /> Nutrition</div>

      <div className="row-between">
        <div>
          <span className="stat-big" key={count} style={{ display: 'inline-block', animation: 'popIn .35s var(--ease-spring)' }}>{count}</span> <span className="stat-unit">meals</span>
          <div className="faint">goal {goals.meals} meals{kcal > 0 ? ` · ≈ ${kcal.toLocaleString()} kcal` : ''}</div>
          {reached && <div className="reached">🎉 Goal reached!</div>}
        </div>
        <button className="round-btn accent" onClick={() => (open ? reset() : setOpen(true))} aria-label="Add meal"><IconPlus size={20} /></button>
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

          {!creating ? (
            <>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Find a food</label>
                <input className="input" value={query} placeholder="Search foods…" autoFocus
                  onChange={(e) => setQuery(e.target.value)} />
              </div>

              <div className="food-results">
                {results.map((f) => (
                  <button key={f.id} className="food-row" onClick={() => logFood(f)}>
                    <span className="fr-emoji">{f.emoji}</span>
                    <span className="fr-body">
                      <span className="fr-name">{f.name}{f.custom && <span className="fr-tag">yours</span>}</span>
                      <span className="fr-sub">{f.serving} · {f.calories} kcal</span>
                    </span>
                    <span className="fr-add"><IconPlus size={16} /></span>
                  </button>
                ))}
                {results.length === 0 && (
                  <div className="faint" style={{ padding: '8px 2px' }}>No match — create it below.</div>
                )}
              </div>

              <button className="btn btn-block" style={{ marginTop: 10 }} onClick={() => setCreating(true)}>
                <IconPlus size={16} /> Create {query.trim() ? `“${query.trim()}”` : 'a new food'}
              </button>
            </>
          ) : (
            <CustomFood
              initialName={query.trim()}
              onCancel={() => setCreating(false)}
              onSave={(food) => {
                onAddFood(food);          // save to the user's library for next time
                onAdd(foodToMeal(food, type));
                notify(`Saved & logged ${food.name}`, '✨');
                reset();
              }}
            />
          )}
        </div>
      )}

      {count > 0 && (
        <div className="log-list">
          {day.meals.map((m) => (
            <div className="log-item pop" key={m.id}>
              <span>{m.emoji || MEAL_TYPES.find((t) => t.t === m.type)?.e || '🍽️'} {m.label}</span>
              <span className="faint mi-kcal">{m.calories ? `${m.calories} kcal` : '●'.repeat(m.quality || 0)}</span>
              <button className="del" onClick={() => onRemove(m.id)} aria-label="Remove"><IconTrash size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .food-results { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; max-height: 234px; overflow-y: auto; }
        .food-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
          padding: 9px 11px; border-radius: var(--r-md); background: var(--surface-soft); border: 1px solid var(--border);
          transition: all var(--dur-fast) var(--ease-spring); }
        .food-row:hover { border-color: var(--sage); transform: translateX(2px); }
        .fr-emoji { font-size: 1.4rem; flex-shrink: 0; }
        .fr-body { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .fr-name { font-weight: 600; display: flex; align-items: center; gap: 7px; }
        .fr-tag { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
          color: var(--sage); background: color-mix(in srgb, var(--sage) 16%, transparent); padding: 1px 6px; border-radius: 99px; }
        .fr-sub { font-size: var(--t-xs); color: var(--text-faint); }
        .fr-add { color: var(--sage); flex-shrink: 0; display: grid; place-items: center;
          width: 26px; height: 26px; border-radius: 50%; background: color-mix(in srgb, var(--sage) 12%, transparent); }
        .mi-kcal { margin-left: auto; color: var(--sage); font-variant-numeric: tabular-nums; font-weight: 600; }
        .q-dot { width: 30px; height: 30px; border-radius: 50%; background: var(--surface-soft);
          border: 1px solid var(--border); transition: all var(--dur) var(--ease-spring); }
        .q-dot.on { background: linear-gradient(135deg, var(--sage), #9CC299); border-color: var(--sage); transform: scale(1.05); }
        .macro-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
      `}</style>
    </div>
  );
}

// Inline form to create + save a custom food with nutrition.
function CustomFood({ initialName, onCancel, onSave }) {
  const [name, setName] = useState(initialName || '');
  const [serving, setServing] = useState('1 serving');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [quality, setQuality] = useState(3);

  const valid = name.trim().length > 0;
  const save = () => valid && onSave(makeFood({ name, serving, calories, protein, carbs, fat, quality }));

  const Num = ({ label, value, set }) => (
    <div className="field">
      <label>{label}</label>
      <input className="input" type="number" inputMode="numeric" min="0" value={value}
        placeholder="0" onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <div className="pop" style={{ marginTop: 12 }}>
      <div className="field">
        <label>Food name</label>
        <input className="input" value={name} placeholder="e.g. Mom's dal" autoFocus onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <label>Serving</label>
        <input className="input" value={serving} placeholder="e.g. 1 bowl" onChange={(e) => setServing(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <label>Calories (kcal)</label>
        <input className="input" type="number" inputMode="numeric" min="0" value={calories} placeholder="0" onChange={(e) => setCalories(e.target.value)} />
      </div>
      <div className="macro-grid">
        <Num label="Protein (g)" value={protein} set={setProtein} />
        <Num label="Carbs (g)" value={carbs} set={setCarbs} />
        <Num label="Fat (g)" value={fat} set={setFat} />
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <label>How nourishing?</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1,2,3,4,5].map((q) => (
            <button key={q} className={`q-dot ${quality >= q ? 'on' : ''}`} onClick={() => setQuality(q)} aria-label={`quality ${q}`} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onCancel}>Back</button>
        <button className="btn btn-primary" style={{ flex: 2 }} disabled={!valid} onClick={save}>Save &amp; log</button>
      </div>
    </div>
  );
}
