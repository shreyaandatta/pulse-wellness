import { useState } from 'react';
import { waterGoalLabel } from '../lib/units.js';
import { prettyDate } from '../lib/dates.js';
import { PILLARS, resolveOrder } from '../lib/pillars.js';
import { isPlus, PLUS_PERKS, PLUS_PRICE, MAX_TRACKERS } from '../lib/plan.js';
import { GENDERS, ACTIVITY_LEVELS, calorieGoal } from '../lib/nutrition.js';
import { WeightStepper, recSubtitle } from './Onboarding.jsx';
import { IconSparkle, IconLock, IconTrash } from './Icons.jsx';

export default function Settings({ state, setGoals, setSettings, toggleTheme, toggleUnits, resetAll, notify, user, onLogout, openPlus, addTracker, removeTracker, plus: plusProp, billing, managePlan }) {
  const { goals, settings } = state;
  const [confirm, setConfirm] = useState(false);
  const metric = settings.units === 'metric';
  const isGuest = user?.guest;
  // Prefer the server-verified status when billing is live; else the local flag.
  const plus = plusProp ?? isPlus(settings);
  const live = !!billing?.enabled;

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

      <div className="card plan-card">
        <div className="card-title">
          <span className="dot" style={{ background: 'var(--amber-500)' }} /> Your plan
          {plus && <span className="plus-pill"><IconSparkle size={10} /> Plus</span>}
        </div>
        {plus ? (
          <>
            <p className="faint" style={{ marginBottom: 12 }}>
              You're on <b>Pulse Plus</b> — all-time history, year in review, custom trackers,
              unlimited friends and spreadsheet export are yours. ✨
            </p>
            {live && billing?.plusUntil && (
              <p className="faint" style={{ fontSize: 'var(--t-xs)', marginBottom: 10 }}>
                {billing.cancelling ? 'Plus ends' : 'Renews'} on <b>{prettyDate(billing.plusUntil.slice(0, 10))}</b>.
              </p>
            )}
            <PlanManageButton live={live} cancelling={billing?.cancelling} managePlan={managePlan} notify={notify} />
            <p className="faint" style={{ fontSize: 'var(--t-xs)', marginTop: 8 }}>
              {live
                ? 'Cancelling keeps Plus until your billing date — and all your data, always.'
                : 'Switching keeps every bit of your data — Plus features just lock again.'}
            </p>
          </>
        ) : (
          <>
            <p className="faint" style={{ marginBottom: 10 }}>You're on the free plan. Plus opens up:</p>
            <ul className="plan-perks">
              {PLUS_PERKS.slice(0, 4).map((perk) => (
                <li key={perk.title}>{perk.emoji} {perk.title}</li>
              ))}
            </ul>
            <button className="btn btn-sm btn-primary" style={{ marginTop: 12 }} onClick={openPlus}>
              <IconSparkle size={14} /> See Pulse Plus · from {PLUS_PRICE.monthly}/mo
            </button>
          </>
        )}
      </div>

      <CustomTrackers
        trackers={state.trackers || []}
        plus={plus} openPlus={openPlus}
        addTracker={addTracker} removeTracker={removeTracker} notify={notify}
      />

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

      <BodyGoal settings={settings} goals={goals} setSettings={setSettings} setGoals={setGoals} metric={metric} notify={notify} />

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
        <p className="faint" style={{ marginTop: 10 }}>
          Made by <strong style={{ color: 'var(--text)' }}>Shreyaan Datta</strong> ·{' '}
          <a className="about-link" href="mailto:shreyaan.datta@gmail.com">shreyaan.datta@gmail.com</a>
        </p>
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
        .about-link { color: var(--amber-600); font-weight: 600; text-decoration: none; }
        .about-link:hover { text-decoration: underline; }

        .plan-card .card-title { gap: 8px; }
        .plan-perks { list-style: none; display: flex; flex-direction: column; gap: 6px;
          font-size: var(--t-sm); color: var(--text-soft); }

        .ct-row { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: var(--r-md);
          background: var(--surface-soft); border: 1px solid var(--border); }
        .ct-emoji { font-size: 1.2rem; }
        .ct-name { font-weight: 600; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ct-goal { font-size: var(--t-xs); color: var(--text-soft); font-weight: 600; white-space: nowrap; }
        .ct-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .ct-form { display: grid; grid-template-columns: 56px 1fr; gap: 8px; }
        .ct-form .full { grid-column: 1 / -1; }
        .ct-two { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; grid-column: 1 / -1; }
        .ct-lbl { font-size: var(--t-xs); font-weight: 600; color: var(--text-soft); margin-bottom: 4px; display: block; }
        .ct-del { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
          color: var(--text-faint); background: var(--surface); border: 1px solid var(--border); transition: all var(--dur-fast); }
        .ct-del:hover { color: var(--bad); border-color: var(--bad); }

        .bg-seg { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .bg-seg .chip { flex: 1 1 auto; justify-content: center; }
        .bg-lbl { font-size: var(--t-sm); font-weight: 600; color: var(--text-soft); display: block; }
        .bg-field { margin-top: 14px; }
        .wt-stepper { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px;
          background: var(--surface-soft); border: 1px solid var(--border); border-radius: var(--r-md); padding: 8px 12px; }
        .wt-val { font-family: var(--font-display); font-weight: 600; font-size: 1.2rem; font-variant-numeric: tabular-nums; }
        .bg-rec { margin-top: 16px; text-align: center; padding: 16px; border-radius: var(--r-lg);
          border: 1px solid var(--border);
          background: radial-gradient(380px 160px at 50% -40%, rgba(246,197,68,0.18), transparent 70%), var(--surface-soft); }
        .bg-rec-eyebrow { font-size: var(--t-xs); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--amber-600); }
        .bg-rec-num { font-family: var(--font-display); font-weight: 600; font-size: 2rem; line-height: 1; margin-top: 6px; }
        .bg-rec-num span { font-family: var(--font); font-size: 0.85rem; font-weight: 600; color: var(--text-soft); }
        .bg-rec-sub { font-size: var(--t-sm); color: var(--text-soft); line-height: 1.45; margin-top: 8px; }
        .bg-current { font-size: var(--t-xs); color: var(--text-faint); margin-top: 10px; }
      `}</style>
    </div>
  );
}

// Cancel (live) or switch back to free (demo), with a one-tap confirm so it's
// never accidental.
function PlanManageButton({ live, cancelling, managePlan, notify }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (live && cancelling) {
    return <p className="faint" style={{ fontSize: 'var(--t-sm)', fontWeight: 600 }}>Your subscription is set to end — thanks for trying Plus. 🌿</p>;
  }
  const label = live ? 'Cancel subscription' : 'Switch back to Free';
  if (!confirm) {
    return <button className="btn btn-sm" onClick={() => setConfirm(true)}>{label}</button>;
  }
  return (
    <button className="btn btn-sm" style={{ color: 'var(--bad)' }} disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await managePlan(); }
        catch (e) { notify(e?.message || 'Could not update your plan', '⚠️'); }
        finally { setBusy(false); setConfirm(false); }
      }}>
      {busy ? 'Working…' : (live ? 'Confirm cancel?' : 'Confirm?')}
    </button>
  );
}

// Body profile → recommended daily calories. Editing any field recomputes the
// suggestion live; one tap applies it as the Nutrition card's daily goal.
function BodyGoal({ settings, goals, setSettings, setGoals, metric, notify }) {
  const { gender, activity } = settings;
  // Mirror the steppers' shown defaults so the estimate isn't blank before the
  // user touches a weight (existing accounts start with null weights).
  const weight = settings.weight ?? 70;
  const targetWeight = settings.targetWeight ?? weight;
  const rec = calorieGoal({ gender, weight, targetWeight, activity });
  const applied = rec && goals.calories === rec.target;

  const apply = () => {
    // Persist the effective profile too, so the suggestion is stable next visit.
    setSettings({ weight, targetWeight });
    setGoals({ calories: rec.target });
    notify(`Daily goal set to ${rec.target.toLocaleString()} kcal`, '🍽️');
  };

  return (
    <div className="card">
      <div className="card-title"><span className="dot" style={{ background: 'var(--sage)' }} /> Body & calorie goal</div>
      <p className="faint" style={{ marginBottom: 4 }}>Tell Pulse a little about you and it suggests a daily calorie target to reach your goal at a healthy pace.</p>

      <div className="bg-field">
        <span className="bg-lbl">Gender</span>
        <div className="bg-seg">
          {GENDERS.map((g) => (
            <button key={g.id} className={`chip ${gender === g.id ? 'active' : ''}`} onClick={() => setSettings({ gender: g.id })}>{g.label}</button>
          ))}
        </div>
      </div>

      <div className="bg-field">
        <span className="bg-lbl">Current weight</span>
        <WeightStepper kg={weight ?? 70} onChange={(kg) => setSettings({ weight: kg })} metric={metric} />
      </div>

      <div className="bg-field">
        <span className="bg-lbl">Target weight</span>
        <WeightStepper kg={targetWeight ?? weight ?? 70} onChange={(kg) => setSettings({ targetWeight: kg })} metric={metric} />
      </div>

      <div className="bg-field">
        <span className="bg-lbl">Daily activity</span>
        <div className="bg-seg">
          {ACTIVITY_LEVELS.map((a) => (
            <button key={a.id} className={`chip ${activity === a.id ? 'active' : ''}`} onClick={() => setSettings({ activity: a.id })}>{a.emoji} {a.label}</button>
          ))}
        </div>
      </div>

      <div className="bg-rec">
        {!gender ? (
          <p className="faint" style={{ margin: 0 }}>Pick your gender above to see a suggested target.</p>
        ) : rec ? (
          <>
            <div className="bg-rec-eyebrow">Suggested daily target</div>
            <div className="bg-rec-num">{rec.target.toLocaleString()} <span>kcal / day</span></div>
            <p className="bg-rec-sub">{recSubtitle(rec, metric)}</p>
            {applied ? (
              <div className="bg-current">✓ This is your Nutrition daily goal.</div>
            ) : (
              <button className="btn btn-sm btn-primary" style={{ marginTop: 12 }} onClick={apply}>
                Use {rec.target.toLocaleString()} kcal as my daily goal
              </button>
            )}
            {goals.calories && !applied && (
              <div className="bg-current">Current goal: {goals.calories.toLocaleString()} kcal/day</div>
            )}
          </>
        ) : null}
      </div>
      <p className="faint" style={{ fontSize: 'var(--t-xs)', marginTop: 10 }}>An estimate to guide you, not medical advice. Check with a professional for a tailored plan.</p>
    </div>
  );
}

// Custom trackers (Plus): define anything countable — meditation minutes,
// pages read, screen-free hours — and it becomes a card on Today.
function CustomTrackers({ trackers, plus, openPlus, addTracker, removeTracker, notify }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [unit, setUnit] = useState('');
  const [goal, setGoal] = useState('');
  const [step, setStep] = useState('');

  const title = (
    <div className="card-title">
      <span className="dot" style={{ background: 'var(--clay)' }} /> Custom trackers <span className="plus-pill">Plus</span>
    </div>
  );

  if (!plus) {
    return (
      <div className="card">
        {title}
        <p className="faint" style={{ marginBottom: 12 }}>
          Track anything that matters to you — meditation, reading, screen-free time —
          each one becomes its own card on Today, with a goal and confetti of its own.
        </p>
        <button className="btn btn-sm btn-primary" onClick={openPlus}><IconLock size={14} /> Unlock with Plus</button>
      </div>
    );
  }

  const submit = () => {
    const n = name.trim();
    const g = Math.max(1, Number(goal) || 1);
    if (!n) { notify('Give your tracker a name', '✏️'); return; }
    if (trackers.length >= MAX_TRACKERS) { notify(`Up to ${MAX_TRACKERS} trackers for now`, '🧩'); return; }
    addTracker({
      name: n.slice(0, 24),
      emoji: (emoji.trim() || '⭐').slice(0, 4),
      unit: unit.trim().slice(0, 10),
      goal: g,
      step: Math.max(1, Number(step) || 1),
    });
    setName(''); setEmoji(''); setUnit(''); setGoal(''); setStep('');
    notify(`${n} added to Today`, '🧩');
  };

  return (
    <div className="card">
      {title}
      {trackers.length > 0 && (
        <div className="ct-list">
          {trackers.map((t) => (
            <div className="ct-row" key={t.id}>
              <span className="ct-emoji">{t.emoji || '⭐'}</span>
              <span className="ct-name">{t.name}</span>
              <span className="ct-goal">goal {t.goal}{t.unit ? ` ${t.unit}` : ''} · +{t.step}</span>
              <button className="ct-del" onClick={() => { removeTracker(t.id); notify(`${t.name} removed`, '🧹'); }} aria-label={`Remove ${t.name}`}>
                <IconTrash size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      {trackers.length === 0 && (
        <p className="faint" style={{ marginBottom: 12 }}>Nothing yet — add your first tracker and it appears on Today.</p>
      )}

      {trackers.length < MAX_TRACKERS ? (
        <div className="ct-form">
          <div>
            <span className="ct-lbl">Emoji</span>
            <input className="input" value={emoji} placeholder="🧘" onChange={(e) => setEmoji(e.target.value)} />
          </div>
          <div>
            <span className="ct-lbl">Name</span>
            <input className="input" value={name} placeholder="e.g. Meditation" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="ct-two">
            <div>
              <span className="ct-lbl">Daily goal</span>
              <input className="input" type="number" min="1" value={goal} placeholder="20" onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div>
              <span className="ct-lbl">Unit</span>
              <input className="input" value={unit} placeholder="min" onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div>
              <span className="ct-lbl">Tap adds</span>
              <input className="input" type="number" min="1" value={step} placeholder="5" onChange={(e) => setStep(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-sm btn-primary full" onClick={submit}>Add tracker</button>
        </div>
      ) : (
        <p className="faint" style={{ fontSize: 'var(--t-xs)' }}>You've got {MAX_TRACKERS} trackers — remove one to add another.</p>
      )}
    </div>
  );
}
