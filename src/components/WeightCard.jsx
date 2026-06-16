import { useMemo, useState } from 'react';
import { IconScale } from './Icons.jsx';
import { WeightStepper } from './Onboarding.jsx';
import { weightLabel, kgToLb } from '../lib/units.js';
import { prettyDate, keyToDate, addDays, todayKey } from '../lib/dates.js';
import { calorieGoal } from '../lib/nutrition.js';

// A weight delta (kg) shown in the user's units, e.g. "down 2.4 kg" worth.
function deltaLabel(kg, metric) {
  const v = metric ? kg : kgToLb(kg);
  const n = Math.round(v * 10) / 10;
  return `${n} ${metric ? 'kg' : 'lb'}`;
}

// A weekly pace magnitude in the user's units, e.g. "0.4 kg" / "0.9 lb".
function rateDisp(kgPerWeek, metric) {
  const v = Math.abs(metric ? kgPerWeek : kgToLb(kgPerWeek));
  return `${v.toFixed(1)} ${metric ? 'kg' : 'lb'}`;
}

// Tracks body weight over time: log today's weigh-in, watch the trend, and see
// progress toward the target weight set in your body profile. Free — weight is
// core to the calorie goal Pulse already computes.
export default function WeightCard({ weights, settings, onLog, notify }) {
  const metric = settings.units !== 'imperial';
  const target = settings.targetWeight != null ? Number(settings.targetWeight) : null;

  // Logged weigh-ins, oldest → newest.
  const entries = useMemo(
    () => Object.entries(weights || {}).map(([key, kg]) => ({ key, kg: Number(kg) }))
      .filter((e) => e.kg > 0).sort((a, b) => (a.key < b.key ? -1 : 1)),
    [weights]
  );

  const latest = entries.length ? entries[entries.length - 1].kg : null;
  const current = settings.weight != null ? Number(settings.weight) : latest;
  const start = entries.length ? entries[0].kg : current;

  const [draft, setDraft] = useState(current ?? 70);

  const has = current != null && current > 0;
  const changed = has && start != null ? current - start : 0;
  const losing = target != null && current != null && target < current;
  const gaining = target != null && current != null && target > current;

  // Progress from the starting weight toward the goal (0–100%).
  let pct = 0, atGoal = false;
  if (target != null && start != null && Math.abs(target - start) > 0.05) {
    pct = Math.max(0, Math.min(100, ((start - current) / (start - target)) * 100));
    atGoal = Math.abs(current - target) < 0.3;
  }

  const log = () => {
    const kg = Math.round(Number(draft) * 10) / 10;
    onLog(kg);
    notify?.('Weight logged', '⚖️');
  };

  // Sparkline geometry — plot entries evenly by index, scaled to their range
  // (with the goal line in view when there's room). A min two points to draw.
  const spark = useMemo(() => {
    if (entries.length < 2) return null;
    const W = 280, H = 70, P = 8;
    const vals = entries.map((e) => e.kg);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (target != null && target >= lo - 6 && target <= hi + 6) { lo = Math.min(lo, target); hi = Math.max(hi, target); }
    if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
    const x = (i) => P + (i / (entries.length - 1)) * (W - P * 2);
    const y = (v) => H - P - ((v - lo) / (hi - lo)) * (H - P * 2);
    const pts = entries.map((e, i) => ({ x: x(i), y: y(e.kg) }));
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H - P} L${P},${H - P} Z`;
    const goalY = target != null && target >= lo && target <= hi ? y(target) : null;
    return { W, H, line, area, pts, goalY, last: pts[pts.length - 1] };
  }, [entries, target]);

  // Closes the weight ↔ calorie loop: fit a trend line through the weigh-ins,
  // read off the real kg/week pace, and project when you'd reach the target —
  // then frame it against the pace your calorie goal is aiming for. Needs ≥10
  // days of span so a couple of noisy weigh-ins don't invent a trend.
  const projection = useMemo(() => {
    if (target == null || current == null || entries.length < 2) return null;
    const t0 = keyToDate(entries[0].key).getTime();
    const xs = entries.map((e) => (keyToDate(e.key).getTime() - t0) / 86400000); // days from first
    const ys = entries.map((e) => e.kg);
    if (xs[xs.length - 1] < 10) return null;
    const n = xs.length;
    const mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { const dx = xs[i] - mx; num += dx * (ys[i] - my); den += dx * dx; }
    if (den === 0) return null;
    const perWeek = (num / den) * 7;            // signed kg/week
    const remaining = current - target;          // >0 → need to lose, <0 → gain
    const losing = remaining > 0;
    const movingToward = losing ? perWeek < -0.05 : perWeek > 0.05;
    const rec = calorieGoal({ gender: settings.gender, weight: current, targetWeight: target, activity: settings.activity, age: settings.age, height: settings.height });
    const goalPace = rec && rec.perWeekKg ? `your ${rec.target.toLocaleString()} kcal goal aims for ~${rateDisp(rec.perWeekKg, metric)}/wk` : null;

    if (movingToward) {
      const weeks = Math.max(1, Math.round(Math.abs(remaining) / Math.abs(perWeek)));
      if (weeks > 130) return { tone: 'flat', text: 'Barely moving toward your goal', sub: goalPace || 'a bigger calorie change would speed this up' };
      const when = weeks <= 12 ? `about ${weeks} ${weeks === 1 ? 'week' : 'weeks'}` : `about ${Math.round(weeks / 4.345)} months`;
      return { tone: 'good', text: `On pace — ${when} to ${weightLabel(target, settings.units)}`, sub: `around ${prettyDate(addDays(todayKey(), weeks * 7))} · averaging ${rateDisp(perWeek, metric)}/wk ${losing ? 'down' : 'up'}` };
    }
    if (Math.abs(perWeek) < 0.05) return { tone: 'flat', text: 'Holding steady', sub: goalPace || 'adjust intake to move toward your goal' };
    return { tone: 'warn', text: 'Trending the other way right now', sub: 'a small calorie adjustment nudges it back' };
  }, [entries, target, current, metric, settings.gender, settings.activity, settings.age, settings.height, settings.units]);

  return (
    <div className="card weight-card">
      <div className="card-title"><span className="dot" style={{ background: 'var(--plum)' }} /><IconScale size={15} /> Weight</div>

      {has ? (
        <>
          <div className="row-between" style={{ alignItems: 'flex-end' }}>
            <div>
              <span className="stat-big" key={current} style={{ animation: 'popIn .35s var(--ease-spring)' }}>{weightLabel(current, settings.units)}</span>
              {entries.length >= 2 && (
                <div className={`wt-change ${changed < -0.05 ? 'down' : changed > 0.05 ? 'up' : ''}`}>
                  {changed < -0.05 ? '▼' : changed > 0.05 ? '▲' : '•'} {deltaLabel(Math.abs(changed), metric)} since {prettyDate(entries[0].key)}
                </div>
              )}
            </div>
            {target != null && (
              <div className="wt-goal">
                {atGoal ? <span className="wt-goal-hit">🎯 At your goal</span>
                  : <>{deltaLabel(Math.abs(current - target), metric)} to {losing ? 'lose' : gaining ? 'gain' : 'go'}</>}
                <div className="faint">goal {weightLabel(target, settings.units)}</div>
              </div>
            )}
          </div>

          {target != null && !atGoal && Math.abs(target - start) > 0.05 && (
            <div className="progress-track" style={{ marginTop: 12 }} title={`${Math.round(pct)}% of the way there`}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--plum), var(--rose))' }} />
            </div>
          )}

          {!atGoal && projection && (
            <div className={`wt-projection ${projection.tone}`}>
              <span>{projection.text}</span>
              {projection.sub && <span className="wt-proj-sub">{projection.sub}</span>}
            </div>
          )}

          {spark ? (
            <svg viewBox={`0 0 ${spark.W} ${spark.H}`} className="wt-spark" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="wtArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--plum)" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="var(--plum)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {spark.goalY != null && (
                <line x1="8" x2={spark.W - 8} y1={spark.goalY} y2={spark.goalY} stroke="var(--rose)" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.7" />
              )}
              <path d={spark.area} fill="url(#wtArea)" />
              <path d={spark.line} fill="none" stroke="var(--plum)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={spark.last.x} cy={spark.last.y} r="4" fill="var(--surface)" stroke="var(--plum)" strokeWidth="2.5" />
            </svg>
          ) : (
            <p className="faint wt-hint">{entries.length === 1 ? 'One more weigh-in draws your trend line.' : 'Log your weight to start tracking your trend.'}</p>
          )}
        </>
      ) : (
        <p className="faint wt-hint" style={{ marginBottom: 4 }}>Log your weight to track progress toward your goal.</p>
      )}

      <div className="wt-log">
        <WeightStepper kg={draft ?? 70} onChange={setDraft} metric={metric} />
        <button className="btn-primary wt-log-btn" onClick={log}>Log today</button>
      </div>

      <style>{`
        .weight-card .wt-change { font-size: var(--t-xs); font-weight: 700; color: var(--text-soft); margin-top: 2px; }
        .weight-card .wt-change.down { color: var(--good); }
        .weight-card .wt-change.up { color: var(--clay); }
        .weight-card .wt-goal { text-align: right; font-size: var(--t-sm); font-weight: 700; color: var(--text); }
        .weight-card .wt-goal .faint { font-weight: 600; margin-top: 1px; }
        .weight-card .wt-goal-hit { color: var(--good); }
        .weight-card .wt-projection { display: flex; flex-direction: column; gap: 2px; margin-top: 12px;
          font-size: var(--t-sm); font-weight: 700; color: var(--text); }
        .weight-card .wt-projection.good { color: var(--good); }
        .weight-card .wt-projection.warn { color: var(--clay); }
        .weight-card .wt-projection.flat { color: var(--text-soft); }
        .weight-card .wt-proj-sub { font-size: var(--t-xs); font-weight: 600; color: var(--text-faint); }
        .weight-card .wt-spark { width: 100%; height: 70px; margin-top: 12px; overflow: visible; }
        .weight-card .wt-hint { margin-top: 10px; font-size: var(--t-sm); }
        .weight-card .wt-log { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
        .weight-card .wt-log .wt-stepper { flex: 1; margin-top: 0; }
        .weight-card .wt-log-btn { flex-shrink: 0; padding: 10px 16px; }
      `}</style>
    </div>
  );
}
