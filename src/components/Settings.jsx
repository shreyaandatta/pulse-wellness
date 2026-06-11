import { useState } from 'react';
import { waterGoalLabel } from '../lib/units.js';
import { PILLARS, resolveOrder } from '../lib/pillars.js';

export default function Settings({ state, setGoals, setSettings, toggleTheme, toggleUnits, resetAll, notify, user, onLogout }) {
  const { goals, settings } = state;
  const [confirm, setConfirm] = useState(false);
  const metric = settings.units === 'metric';
  const isGuest = user?.guest;

  const order = resolveOrder(settings.pillarOrder);
  const hiddenSet = new Set(settings.hiddenPillars || []);
  const movePillar = (id, dir) => {
    const arr = [...order];
    const i = arr.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setSettings({ pillarOrder: arr });
  };
  const toggleHide = (id) => {
    const next = new Set(hiddenSet);
    next.has(id) ? next.delete(id) : next.add(id);
    setSettings({ hiddenPillars: [...next] });
  };

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
        <Row label="Haptic feedback">
          <button className={`toggle ${settings.haptics ? 'on' : ''}`} onClick={() => setSettings({ haptics: !settings.haptics })} aria-label="Toggle haptics"><span className="knob" /></button>
        </Row>
        <Row label="Celebration sound">
          <button className={`toggle ${settings.sounds ? 'on' : ''}`} onClick={() => setSettings({ sounds: !settings.sounds })} aria-label="Toggle sound"><span className="knob" /></button>
        </Row>
        <div className="faint" style={{ fontSize: 'var(--t-xs)', marginTop: 6 }}>Haptics buzz on taps where your device supports it (most Android phones; iPhone web doesn't allow it).</div>
      </div>

      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--plum)' }} /> Dashboard layout</div>
        <p className="faint" style={{ marginBottom: 12 }}>Reorder or hide the trackers on your Today screen.</p>
        <div className="pillar-list">
          {order.map((id, i) => {
            const meta = PILLARS.find((p) => p.id === id);
            const hidden = hiddenSet.has(id);
            return (
              <div className={`pillar-row ${hidden ? 'off' : ''}`} key={id}>
                <span className="pl-emoji">{meta.emoji}</span>
                <span className="pl-name">{meta.label}</span>
                <div className="pl-actions">
                  <button className="ord-btn" disabled={i === 0} onClick={() => movePillar(id, -1)} aria-label="Move up">↑</button>
                  <button className="ord-btn" disabled={i === order.length - 1} onClick={() => movePillar(id, 1)} aria-label="Move down">↓</button>
                  <button className="btn btn-sm" onClick={() => toggleHide(id)}>{hidden ? 'Show' : 'Hide'}</button>
                </div>
              </div>
            );
          })}
        </div>
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
        <p className="faint" style={{ marginBottom: 14 }}>{user?.cloud
          ? <>Your data syncs privately to your own account and is protected by row-level security. To back up, restore, or see your full history, open the <b>Data</b> tab.</>
          : <>Everything is stored privately on this device. To back up, restore, or see your full history, open the <b>Data</b> tab.</>}</p>
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

        .toggle { width: 46px; height: 27px; border-radius: 99px; background: var(--surface-soft); border: 1px solid var(--border);
          position: relative; transition: background var(--dur) var(--ease-spring); flex-shrink: 0; }
        .toggle .knob { position: absolute; top: 2px; left: 2px; width: 21px; height: 21px; border-radius: 50%;
          background: #fff; box-shadow: var(--shadow-xs); transition: transform var(--dur) var(--ease-spring); }
        .toggle.on { background: linear-gradient(135deg, var(--amber-400), var(--amber-600)); border-color: var(--amber-500); }
        .toggle.on .knob { transform: translateX(19px); }

        .pillar-list { display: flex; flex-direction: column; gap: 8px; }
        .pillar-row { display: flex; align-items: center; gap: 12px; padding: 9px 11px; border-radius: var(--r-md);
          background: var(--surface-soft); border: 1px solid var(--border); transition: opacity var(--dur); }
        .pillar-row.off { opacity: 0.5; }
        .pl-emoji { font-size: 1.25rem; }
        .pl-name { font-weight: 600; flex: 1; }
        .pl-actions { display: flex; align-items: center; gap: 6px; }
        .ord-btn { width: 30px; height: 30px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border);
          font-size: 1rem; font-weight: 700; color: var(--text-soft); transition: all var(--dur-fast) var(--ease-spring); }
        .ord-btn:hover:not(:disabled) { border-color: var(--amber-400); color: var(--amber-600); }
        .ord-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
