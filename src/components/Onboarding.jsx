import { useState, useRef, useEffect } from 'react';
import { celebrate } from '../lib/celebrate.js';
import { waterGoalLabel, kgToLb, lbToKg, heightLabel } from '../lib/units.js';
import { GENDERS, ACTIVITY_LEVELS, calorieGoal, proteinGoal } from '../lib/nutrition.js';

// A short, warm setup that turns the empty first screen into a welcome. Each
// step pops in; the finish line gets a confetti burst.
export default function Onboarding({ name: initialName, goals: initialGoals, settings: initialSettings, onFinish }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName || '');
  const [goals, setGoals] = useState({ ...initialGoals });
  const [units, setUnits] = useState(initialSettings.units || 'metric');
  const [theme, setTheme] = useState(initialSettings.theme || 'light');
  // Body profile (weights kept in kg internally) → recommended calorie goal.
  const [gender, setGender] = useState(initialSettings.gender || '');
  const [weight, setWeight] = useState(initialSettings.weight ?? 70);
  const [targetWeight, setTargetWeight] = useState(initialSettings.targetWeight ?? 70);
  const [age, setAge] = useState(initialSettings.age ?? 25);
  const [height, setHeight] = useState(initialSettings.height ?? 170);
  const [activity, setActivity] = useState(initialSettings.activity || 'light');
  const metric = units === 'metric';

  const rec = calorieGoal({ gender, weight, targetWeight, activity, age, height });
  const protRec = proteinGoal({ weight, activity, gender });

  const STEPS = 5;
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const patch = (k, v) => setGoals((g) => ({ ...g, [k]: v }));

  // Only commit a calorie goal once they've actually told us their gender —
  // otherwise the dashboard would show a target derived from pure defaults.
  const finish = () => onFinish(
    { ...goals, calories: gender ? (rec?.target ?? null) : null, protein: gender ? (protRec?.grams ?? null) : null },
    { name: name.trim(), units, theme, gender, weight, targetWeight, age, height, activity, onboarded: true },
  );

  return (
    <div className="ob">
      <div className="ob-card">
        <div className="ob-progress">
          {Array.from({ length: STEPS }).map((_, i) => <span key={i} className={`ob-dot ${i <= step ? 'on' : ''}`} />)}
        </div>

        <div className="ob-step pop" key={step}>
          {step === 0 && (
            <Welcome name={name} setName={setName} onNext={next} />
          )}
          {step === 1 && (
            <Goals goals={goals} patch={patch} metric={metric} units={units} />
          )}
          {step === 2 && (
            <Prefs units={units} setUnits={setUnits} theme={theme} setTheme={setTheme} />
          )}
          {step === 3 && (
            <Body gender={gender} setGender={setGender} weight={weight} setWeight={setWeight}
              targetWeight={targetWeight} setTargetWeight={setTargetWeight}
              age={age} setAge={setAge} height={height} setHeight={setHeight}
              activity={activity} setActivity={setActivity} metric={metric} rec={rec} protRec={protRec} />
          )}
          {step === 4 && (
            <Done name={name} onFinish={finish} />
          )}
        </div>

        {step > 0 && step < STEPS - 1 && (
          <div className="ob-nav">
            <button className="btn" onClick={back}>Back</button>
            <button className="btn btn-primary" onClick={next}>Continue</button>
          </div>
        )}
        {step === 0 && (
          <button className="ob-skip" onClick={finish}>Skip setup for now</button>
        )}
      </div>

      <style>{`
        .ob { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
        .ob::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
          background: radial-gradient(820px 480px at 50% -10%, rgba(246,197,68,0.22), transparent 60%); }
        .ob-card { width: 100%; max-width: 440px; background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--r-xl); padding: var(--s-8) var(--s-6); box-shadow: var(--shadow-lg); }
        .ob-progress { display: flex; gap: 8px; justify-content: center; margin-bottom: var(--s-6); }
        .ob-dot { width: 28px; height: 5px; border-radius: 99px; background: var(--surface-soft); transition: background var(--dur); }
        .ob-dot.on { background: linear-gradient(90deg, var(--amber-400), var(--amber-600)); }
        .ob-step { text-align: center; }
        .ob-eyebrow { font-size: var(--t-xs); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--amber-600); }
        .ob-h { font-family: var(--font-display); font-weight: 600; font-size: 1.7rem; line-height: 1.15; letter-spacing: -0.01em; margin: 8px 0 10px; }
        .ob-sub { color: var(--text-soft); line-height: 1.5; max-width: 34ch; margin: 0 auto; }
        .ob-nav { display: flex; gap: 10px; margin-top: var(--s-6); }
        .ob-nav .btn { flex: 1; }
        .ob-skip { display: block; margin: var(--s-5) auto 0; font-size: var(--t-sm); font-weight: 600; color: var(--text-faint); }
        .ob-skip:hover { color: var(--text-soft); }

        .ob-emoji { font-size: 2.6rem; }
        .ob-field { margin-top: var(--s-5); text-align: left; }
        .ob-field label { font-size: var(--t-sm); font-weight: 600; color: var(--text-soft); display: block; margin-bottom: 6px; }

        .goal-row { display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 14px 0; border-bottom: 1px solid var(--border); }
        .goal-row:last-child { border-bottom: none; }
        .goal-label { display: flex; align-items: center; gap: 10px; font-weight: 600; text-align: left; }
        .goal-label .ge { font-size: 1.3rem; }
        .goal-sub { font-size: var(--t-xs); color: var(--text-faint); font-weight: 500; }
        .ob-stepper { display: flex; align-items: center; gap: 10px; }
        .ob-stepper .mini-val { min-width: 76px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }

        .pref-group { text-align: left; margin-top: var(--s-5); }
        .seg { display: flex; gap: 8px; margin-top: 8px; }
        .seg .chip { flex: 1; justify-content: center; padding: 12px; }
        .seg.wrap { flex-wrap: wrap; }
        .seg.wrap .chip { flex: 1 1 calc(50% - 4px); }

        .wt-stepper { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px;
          background: var(--surface-soft); border: 1px solid var(--border); border-radius: var(--r-md); padding: 8px 12px; }
        .wt-val { font-family: var(--font-display); font-weight: 600; font-size: 1.25rem; font-variant-numeric: tabular-nums; }
        .rec { margin-top: var(--s-5); text-align: center; padding: 16px;
          border-radius: var(--r-lg); border: 1px solid var(--amber-300, var(--border));
          background: radial-gradient(420px 180px at 50% -40%, rgba(246,197,68,0.20), transparent 70%), var(--surface-soft); }
        .rec-eyebrow { font-size: var(--t-xs); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--amber-600); }
        .rec-num { font-family: var(--font-display); font-weight: 600; font-size: 2.1rem; line-height: 1; margin-top: 6px; }
        .rec-num span { font-family: var(--font); font-size: 0.9rem; font-weight: 600; color: var(--text-soft); }
        .rec-sub { font-size: var(--t-sm); color: var(--text-soft); line-height: 1.45; margin-top: 8px; }
        .rec-empty { font-size: var(--t-sm); color: var(--text-faint); }
      `}</style>
    </div>
  );
}

function Welcome({ name, setName, onNext }) {
  return (
    <>
      <div className="ob-emoji">🌿</div>
      <div className="ob-h">Welcome to Pulse</div>
      <p className="ob-sub">Let's set things up in a few seconds so your dashboard feels like yours.</p>
      <div className="ob-field">
        <label>First, your name</label>
        <input className="input" value={name} placeholder="What should we call you?" autoFocus
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onNext()} />
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={onNext}>Let's go</button>
    </>
  );
}

function Stepper({ value, onChange, step, min, fmt }) {
  return (
    <div className="ob-stepper">
      <button className="round-btn" style={{ width: 38, height: 38, fontSize: '1.2rem' }} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}>−</button>
      <span className="mini-val">{fmt(value)}</span>
      <button className="round-btn" style={{ width: 38, height: 38, fontSize: '1.2rem' }} onClick={() => onChange(+(value + step).toFixed(2))}>+</button>
    </div>
  );
}

function Goals({ goals, patch, metric, units }) {
  return (
    <>
      <div className="ob-eyebrow">Step 2</div>
      <div className="ob-h">Set your daily goals</div>
      <p className="ob-sub">Sensible defaults are ready — nudge anything to fit you. You can change these anytime.</p>
      <div style={{ marginTop: 12 }}>
        <div className="goal-row">
          <div className="goal-label"><span className="ge">💧</span><div>Water<div className="goal-sub">{waterGoalLabel(goals.water, units)}</div></div></div>
          <Stepper value={goals.water} step={250} min={500} fmt={() => (metric ? `${(goals.water/1000).toFixed(goals.water%1000?1:0)} L` : `${Math.round(goals.water/29.5735)} oz`)} onChange={(v) => patch('water', v)} />
        </div>
        <div className="goal-row">
          <div className="goal-label"><span className="ge">🌙</span><div>Sleep</div></div>
          <Stepper value={goals.sleep} step={0.5} min={4} fmt={(v) => `${v} h`} onChange={(v) => patch('sleep', v)} />
        </div>
        <div className="goal-row">
          <div className="goal-label"><span className="ge">🔥</span><div>Active minutes</div></div>
          <Stepper value={goals.activeMinutes} step={5} min={5} fmt={(v) => `${v} min`} onChange={(v) => patch('activeMinutes', v)} />
        </div>
        <div className="goal-row">
          <div className="goal-label"><span className="ge">👟</span><div>Steps</div></div>
          <Stepper value={goals.steps} step={500} min={1000} fmt={(v) => v.toLocaleString()} onChange={(v) => patch('steps', v)} />
        </div>
      </div>
    </>
  );
}

function Prefs({ units, setUnits, theme, setTheme }) {
  return (
    <>
      <div className="ob-eyebrow">Step 3</div>
      <div className="ob-h">A couple of preferences</div>
      <p className="ob-sub">Choose what feels natural. Everything is changeable later in Settings.</p>
      <div className="pref-group">
        <label style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text-soft)' }}>Units</label>
        <div className="seg">
          <button className={`chip ${units === 'metric' ? 'active' : ''}`} onClick={() => setUnits('metric')}>Metric · ml, km</button>
          <button className={`chip ${units === 'imperial' ? 'active' : ''}`} onClick={() => setUnits('imperial')}>Imperial · oz, mi</button>
        </div>
      </div>
      <div className="pref-group">
        <label style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text-soft)' }}>Look</label>
        <div className="seg">
          <button className={`chip ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>☀️ Light</button>
          <button className={`chip ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>🌙 Dark</button>
        </div>
      </div>
    </>
  );
}

// A weight stepper that reads/writes kg but shows the user's units. Steps by 1
// display unit (1 kg or 1 lb) so it feels natural either way.
export function WeightStepper({ kg, onChange, metric, min = 30 }) {
  const disp = metric ? Math.round(kg) : Math.round(kgToLb(kg));
  const minDisp = metric ? min : Math.round(kgToLb(min));
  const set = (d) => {
    const nd = Math.max(minDisp, disp + d);
    onChange(metric ? nd : +lbToKg(nd).toFixed(1));
  };
  return (
    <div className="wt-stepper">
      <button className="round-btn" style={{ width: 38, height: 38, fontSize: '1.2rem' }} onClick={() => set(-1)} aria-label="Less">−</button>
      <span className="wt-val">{disp} {metric ? 'kg' : 'lb'}</span>
      <button className="round-btn" style={{ width: 38, height: 38, fontSize: '1.2rem' }} onClick={() => set(1)} aria-label="More">+</button>
    </div>
  );
}

// Age in whole years.
export function AgeStepper({ value, onChange, min = 13, max = 100 }) {
  const v = value ?? 25;
  return (
    <div className="wt-stepper">
      <button className="round-btn" style={{ width: 38, height: 38, fontSize: '1.2rem' }} onClick={() => onChange(Math.max(min, v - 1))} aria-label="Younger">−</button>
      <span className="wt-val">{v} yrs</span>
      <button className="round-btn" style={{ width: 38, height: 38, fontSize: '1.2rem' }} onClick={() => onChange(Math.min(max, v + 1))} aria-label="Older">+</button>
    </div>
  );
}

// Height stored in cm, shown in cm (metric) or ft/in (imperial). Steps by 1 cm
// or 1 inch so it feels natural either way.
export function HeightStepper({ cm, onChange, metric, min = 120, max = 220 }) {
  const v = cm ?? 170;
  const set = (dir) => {
    if (metric) { onChange(Math.max(min, Math.min(max, Math.round(v) + dir))); return; }
    const inMin = Math.round(min / 2.54), inMax = Math.round(max / 2.54);
    const totalIn = Math.max(inMin, Math.min(inMax, Math.round(v / 2.54) + dir));
    onChange(+(totalIn * 2.54).toFixed(1));
  };
  return (
    <div className="wt-stepper">
      <button className="round-btn" style={{ width: 38, height: 38, fontSize: '1.2rem' }} onClick={() => set(-1)} aria-label="Shorter">−</button>
      <span className="wt-val">{heightLabel(v, metric ? 'metric' : 'imperial')}</span>
      <button className="round-btn" style={{ width: 38, height: 38, fontSize: '1.2rem' }} onClick={() => set(1)} aria-label="Taller">+</button>
    </div>
  );
}

// Friendly one-liner explaining the recommended number. Shared by onboarding
// and Settings so the wording stays identical.
export function recSubtitle(rec, metric) {
  if (!rec) return '';
  const rate = metric ? `${rec.perWeekKg} kg` : `${(rec.perWeekKg * 2.20462).toFixed(1)} lb`;
  if (rec.direction === 'maintain') return 'Enough to comfortably maintain your current weight.';
  const verb = rec.direction === 'lose' ? 'lose' : 'gain';
  const base = `A ${rec.direction === 'lose' ? 'gentle deficit' : 'small surplus'} to ${verb} about ${rate}/week — on track to reach your target in roughly ${rec.weeks} weeks.`;
  return rec.floored
    ? `${base} We kept it at a safe minimum of ${rec.floor.toLocaleString()} kcal.`
    : base;
}

function RecCard({ rec, gender, metric }) {
  if (!gender) return <div className="rec"><p className="rec-empty">Pick your gender above and we'll suggest a daily calorie target.</p></div>;
  if (!rec) return <div className="rec"><p className="rec-empty">Add your weight and we'll suggest a daily calorie target.</p></div>;
  return (
    <div className="rec">
      <div className="rec-eyebrow">Your suggested daily target</div>
      <div className="rec-num">{rec.target.toLocaleString()} <span>kcal / day</span></div>
      <p className="rec-sub">{recSubtitle(rec, metric)}</p>
    </div>
  );
}

function Body({ gender, setGender, weight, setWeight, targetWeight, setTargetWeight, age, setAge, height, setHeight, activity, setActivity, metric, rec, protRec }) {
  return (
    <>
      <div className="ob-eyebrow">Step 4</div>
      <div className="ob-h">A bit about you</div>
      <p className="ob-sub">Your age and height let Pulse use the Mifflin-St Jeor formula for a precise calorie target. You can edit or skip it anytime.</p>

      <div className="pref-group">
        <label style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text-soft)' }}>Gender</label>
        <div className="seg">
          {GENDERS.map((g) => (
            <button key={g.id} className={`chip ${gender === g.id ? 'active' : ''}`} onClick={() => setGender(g.id)}>{g.label}</button>
          ))}
        </div>
      </div>

      <div className="pref-group">
        <label style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text-soft)' }}>Age</label>
        <AgeStepper value={age} onChange={setAge} />
      </div>

      <div className="pref-group">
        <label style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text-soft)' }}>Height</label>
        <HeightStepper cm={height} onChange={setHeight} metric={metric} />
      </div>

      <div className="pref-group">
        <label style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text-soft)' }}>Current weight</label>
        <WeightStepper kg={weight} onChange={setWeight} metric={metric} />
      </div>

      <div className="pref-group">
        <label style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text-soft)' }}>Target weight</label>
        <WeightStepper kg={targetWeight} onChange={setTargetWeight} metric={metric} />
      </div>

      <div className="pref-group">
        <label style={{ fontSize: 'var(--t-sm)', fontWeight: 600, color: 'var(--text-soft)' }}>Daily activity</label>
        <div className="seg wrap">
          {ACTIVITY_LEVELS.map((a) => (
            <button key={a.id} className={`chip ${activity === a.id ? 'active' : ''}`} onClick={() => setActivity(a.id)}>{a.emoji} {a.label}</button>
          ))}
        </div>
      </div>

      <RecCard rec={rec} gender={gender} metric={metric} />

      {protRec && (
        <div className="rec" style={{ marginTop: 'var(--s-4)' }}>
          <div className="rec-eyebrow">Suggested protein target</div>
          <div className="rec-num">{protRec.grams} <span>g / day</span></div>
          <p className="rec-sub">≈ {protRec.perKg} g per kg of body weight, based on {protRec.training}. You can change it anytime.</p>
        </div>
      )}
    </>
  );
}

function Done({ name, onFinish }) {
  const ref = useRef(null);
  useEffect(() => { const t = setTimeout(() => celebrate(ref.current, 40), 200); return () => clearTimeout(t); }, []);
  return (
    <div ref={ref}>
      <div className="ob-emoji">🎉</div>
      <div className="ob-h">{name ? `You're all set, ${name}` : "You're all set"}</div>
      <p className="ob-sub">Your dashboard is ready. Log your first glass of water or a few minutes of movement to watch your wellness score come alive.</p>
      <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={onFinish}>Enter Pulse</button>
    </div>
  );
}
