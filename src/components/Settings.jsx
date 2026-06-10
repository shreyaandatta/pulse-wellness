import { useState } from 'react';
import { waterGoalLabel } from '../lib/units.js';

export default function Settings({ state, setGoals, setSettings, toggleTheme, toggleUnits, resetAll, notify, user, onLogout }) {
  const { goals, settings } = state;
  const [confirm, setConfirm] = useState(false);
  const metric = settings.units === 'metric';
  const isGuest = user?.guest;

  const Row = ({ label, children }) => (
    <div className="set-row"><span>{label}</span><div className="set-control">{children}</div></div>
  );

  const Stepper = ({ value, onChange, step, suffix, min = 0 }) => (
    <div className="mini-step">
      <button className="round-btn" style={{ width: 36, height: 36, fontSize: '1.1rem' }} onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <span className="mini-val">{value}{suffix}</span>
      <button className="round-btn" style={{ width: 36, height: 36, fontSize: '1.1rem' }} onClick={() => onChange(value + step)}>+</button>
    </div>
  );

  return (
    <div className="grid cols-2 stagger">
      <div className="card account-card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--good)' }} /> Account</div>
        <div className="acct">
          <div className="acct-avatar">{(user?.name || 'G').trim().charAt(0).toUpperCase()}</div>
          <div className="acct-body">
            <div className="acct-name">{isGuest ? 'Exploring as guest' : user?.name}</div>
            <div className="faint">{isGuest
              ? 'Create an account to keep your space private'
              : (user?.cloud ? user.email : `@${user?.id}`)}</div>
          </div>
        </div>
        <button className="btn btn-sm btn-block" style={{ marginTop: 14 }} onClick={onLogout}>
          {isGuest ? 'Sign in or create an account' : 'Sign out'}
        </button>
      </div>

      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /> Profile & Look</div>
        <div className="field">
          <label>Your name</label>
          <input className="input" value={settings.name} placeholder="Add your name" onChange={(e) => setSettings({ name: e.target.value })} />
        </div>
        <Row label="Theme">
          <button className="btn btn-sm" onClick={toggleTheme}>{settings.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</button>
        </Row>
        <Row label="Units">
          <button className="btn btn-sm" onClick={toggleUnits}>{metric ? 'Metric (ml, km)' : 'Imperial (oz, mi)'}</button>
        </Row>
      </div>

      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--water)' }} /> Daily Goals</div>
        <Row label={`💧 Water`}>
          <Stepper value={goals.water} step={metric ? 250 : 250} suffix="" onChange={(v) => setGoals({ water: v })} min={250} />
        </Row>
        <div className="faint" style={{ textAlign: 'right', marginTop: -6 }}>{waterGoalLabel(goals.water, settings.units)}</div>
        <Row label="🌙 Sleep (h)"><Stepper value={goals.sleep} step={0.5} suffix="h" onChange={(v) => setGoals({ sleep: v })} min={4} /></Row>
        <Row label="🔥 Active (min)"><Stepper value={goals.activeMinutes} step={5} suffix="m" onChange={(v) => setGoals({ activeMinutes: v })} min={5} /></Row>
        <Row label="🥗 Meals"><Stepper value={goals.meals} step={1} suffix="" onChange={(v) => setGoals({ meals: v })} min={1} /></Row>
        <Row label="👟 Steps"><Stepper value={goals.steps} step={500} suffix="" onChange={(v) => setGoals({ steps: v })} min={1000} /></Row>
      </div>

      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--clay)' }} /> Data</div>
        <p className="faint" style={{ marginBottom: 14 }}>Everything is stored privately on this device — no cloud, no tracking. To back up, restore, or see your full history, open the <b>Data</b> tab.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!confirm ? (
            <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => setConfirm(true)}>Reset all data</button>
          ) : (
            <button className="btn btn-sm btn-primary" style={{ background: 'var(--bad)', boxShadow: 'none' }}
              onClick={() => { resetAll(); setConfirm(false); notify('All data cleared', '🧹'); }}>Tap to confirm</button>
          )}
        </div>
      </div>

      <div className="card about">
        <div className="card-title"><span className="dot" style={{ background: 'var(--rose)' }} /> About Pulse</div>
        <p className="faint">Pulse is your calm daily wellness companion — five pillars, one score, zero noise. Built to be fast, private, and genuinely useful.</p>
        <p className="faint" style={{ marginTop: 8 }}>v1.0 · made with care</p>
      </div>

      <style>{`
        .set-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .set-row:last-of-type { border-bottom: none; }
        .mini-step { display: flex; align-items: center; gap: 10px; }
        .mini-val { min-width: 64px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
        .field { margin-bottom: 12px; }
        .acct { display: flex; align-items: center; gap: 14px; }
        .acct-avatar { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
          font-family: var(--font-display); font-weight: 600; font-size: 1.3rem; color: #fff;
          background: linear-gradient(135deg, var(--amber-400), var(--amber-600)); box-shadow: var(--shadow-glow); }
        .acct-name { font-weight: 700; }
      `}</style>
    </div>
  );
}
