import { useState, useRef, useEffect } from 'react';
import { celebrate } from '../lib/celebrate.js';
import { waterGoalLabel } from '../lib/units.js';

// A short, warm setup that turns the empty first screen into a welcome. Each
// step pops in; the finish line gets a confetti burst.
export default function Onboarding({ name: initialName, goals: initialGoals, settings: initialSettings, onFinish }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName || '');
  const [goals, setGoals] = useState({ ...initialGoals });
  const [units, setUnits] = useState(initialSettings.units || 'metric');
  const [theme, setTheme] = useState(initialSettings.theme || 'light');
  const metric = units === 'metric';

  const STEPS = 4;
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const patch = (k, v) => setGoals((g) => ({ ...g, [k]: v }));

  const finish = () => onFinish(goals, { name: name.trim(), units, theme, onboarded: true });

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
            <Done name={name} onFinish={finish} />
          )}
        </div>

        {step > 0 && step < 3 && (
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
