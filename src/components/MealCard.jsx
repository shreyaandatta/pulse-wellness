import { useState, useRef } from 'react';
import { IconLeaf, IconPlus, IconTrash } from './Icons.jsx';
import { useGoalCelebration } from '../hooks/useGoalCelebration.js';
import { searchFoods, makeFood, foodToMeal, dayCalories, fmtQty } from '../lib/foods.js';

const MEAL_TYPES = [
  { t: 'Breakfast', e: '🍳' }, { t: 'Lunch', e: '🥗' },
  { t: 'Dinner', e: '🍲' }, { t: 'Snack', e: '🍎' },
];

export default function MealCard({ day, dayKey, goals, foods, onAdd, onAddFood, onRemove, notify }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('Breakfast');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false); // custom-food form open?
  const [picked, setPicked] = useState(null);      // food chosen, awaiting quantity
  const [qty, setQty] = useState(1);
  const cardRef = useRef(null);

  const count = day.meals.length;
  const pct = Math.min(100, (count / Math.max(1, goals.meals)) * 100);
  const reached = count >= goals.meals;
  const kcal = dayCalories(day);

  useGoalCelebration(reached, dayKey, cardRef, () => notify('All meals logged!', '🎉'));

  const results = searchFoods(query, foods).slice(0, 8);

  const reset = () => { setOpen(false); setCreating(false); setQuery(''); setPicked(null); setQty(1); };

  const choose = (food) => { setPicked(food); setQty(1); };

  const logFood = (food, amount) => {
    const q = amount ?? 1;
    onAdd(foodToMeal(food, type, q));
    notify(`${food.emoji} ${food.name}${q !== 1 ? ` ×${fmtQty(q)}` : ''} · ${type}`, '🥗');
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

          {picked ? (
            <QuantityPanel food={picked} qty={qty} setQty={setQty}
              onBack={() => setPicked(null)} onConfirm={() => logFood(picked, qty)} />
          ) : !creating ? (
            <>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Find a food</label>
                <input className="input" value={query} placeholder="Search foods…" autoFocus
                  onChange={(e) => setQuery(e.target.value)} />
              </div>

              <div className="food-results">
                {results.map((f) => (
                  <button key={f.id} className="food-row" onClick={() => choose(f)}>
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
              <span>{m.emoji || MEAL_TYPES.find((t) => t.t === m.type)?.e || '🍽️'} {m.label}{m.qty && m.qty !== 1 ? ` ×${fmtQty(m.qty)}` : ''}</span>
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
        .qp { margin-top: 14px; }
        .qp-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .qp-emoji { font-size: 1.8rem; }
        .qp-name { font-weight: 700; }
        .qty-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .qty-stepper { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px;
          background: var(--surface-soft); border: 1px solid var(--border); border-radius: var(--r-md); padding: 10px 12px; }
        .qp-amount { text-align: center; }
        .qp-amount b { font-family: var(--font-display); font-size: 1.5rem; line-height: 1; }
        .qp-kcal { display: block; font-size: var(--t-xs); color: var(--sage); font-weight: 600; margin-top: 3px; }
      `}</style>
    </div>
  );
}

// Choose how much of a food to log — preset chips plus a ¼-step stepper. All
// nutrition scales live so you see the real calories before adding.
function QuantityPanel({ food, qty, setQty, onBack, onConfirm }) {
  const step = (d) => setQty((q) => Math.max(0.25, +(q + d).toFixed(2)));
  const kcal = Math.round(food.calories * qty);
  return (
    <div className="qp pop">
      <div className="qp-head">
        <span className="qp-emoji">{food.emoji}</span>
        <div>
          <div className="qp-name">{food.name}</div>
          <div className="fr-sub">{food.serving} · {food.calories} kcal each</div>
        </div>
      </div>

      <label style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text-soft)' }}>How much?</label>
      <div className="qty-chips" style={{ marginTop: 8 }}>
        {[0.5, 1, 1.5, 2, 3].map((m) => (
          <button key={m} className={`chip ${qty === m ? 'active' : ''}`} onClick={() => setQty(m)}>{fmtQty(m)}×</button>
        ))}
      </div>

      <div className="qty-stepper">
        <button className="round-btn" style={{ width: 38, height: 38, fontSize: '1.2rem' }} onClick={() => step(-0.25)} aria-label="Less">−</button>
        <div className="qp-amount">
          <b>{fmtQty(qty)}×</b>
          <span className="qp-kcal">{kcal} kcal · {food.serving}</span>
        </div>
        <button className="round-btn" style={{ width: 38, height: 38, fontSize: '1.2rem' }} onClick={() => step(0.25)} aria-label="More">+</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onBack}>Back</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={onConfirm}>Add {fmtQty(qty)}× · {kcal} kcal</button>
      </div>
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
