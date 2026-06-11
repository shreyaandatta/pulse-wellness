import { useState, useMemo } from 'react';
import { lastNDays, weekdayShort, dayNum, isToday, todayKey, keyToDate } from '../lib/dates.js';
import { getDay } from '../lib/storage.js';
import { dayScore } from '../lib/score.js';
import { mlToDisplay } from '../lib/units.js';
import { movingAverage } from '../lib/insights.js';
import { FREE_HISTORY_DAYS } from '../lib/plan.js';
import { IconLock } from './Icons.jsx';

// Ranges, split by plan: free sees up to FREE_HISTORY_DAYS back, Plus gets the
// long views (n: 0 means "everything since the first logged day").
const FREE_RANGES = [
  { n: 7, label: '7d' }, { n: 14, label: '14d' }, { n: FREE_HISTORY_DAYS, label: `${FREE_HISTORY_DAYS}d` },
];
const PLUS_RANGES = [
  { n: 30, label: '30d' }, { n: 90, label: '90d' }, { n: 365, label: '1y' }, { n: 0, label: 'All' },
];

const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function TrendCharts({ state, units, plus, openPlus }) {
  const [metric, setMetric] = useState('score');
  const [range, setRange] = useState(7);

  // "All" spans from the first logged day to today (at least a month of canvas).
  const allN = useMemo(() => {
    const first = Object.keys(state.days).sort()[0];
    if (!first) return 30;
    const span = Math.round((keyToDate(todayKey()) - keyToDate(first)) / 86400000) + 1;
    return Math.max(30, span);
  }, [state.days]);

  const effectiveN = range === 0 ? allN : range;
  const days = useMemo(() => lastNDays(effectiveN), [effectiveN]);

  const metrics = {
    score:    { label: 'Wellness', color: 'var(--amber-500)', get: (d) => dayScore(d, state.goals), max: 100, fmt: (v) => v, unit: '' },
    water:    { label: 'Water', color: 'var(--water)', get: (d) => d.water, max: Math.max(state.goals.water, 1), fmt: (v) => mlToDisplay(v, units).value, unit: mlToDisplay(0, units).unit },
    sleep:    { label: 'Sleep', color: 'var(--plum)', get: (d) => d.sleep || 0, max: 12, fmt: (v) => v ? v.toFixed(1) : 0, unit: 'h' },
    movement: { label: 'Active', color: 'var(--clay)', get: (d) => (d.workouts||[]).reduce((s,w)=>s+(w.minutes||0),0), max: Math.max(state.goals.activeMinutes*2,60), fmt:(v)=>v, unit: 'm' },
    mood:     { label: 'Mood', color: 'var(--rose)', get: (d) => d.mood || 0, max: 5, fmt: (v) => v || 0, unit: '/5' },
    steps:    { label: 'Steps', color: 'var(--amber-600)', get: (d) => d.steps || 0, max: Math.max(state.goals.steps, 1), fmt: (v) => v.toLocaleString(), unit: '' },
  };

  const m = metrics[metric];
  const series = days.map((k) => ({ key: k, raw: m.get(getDay(state, k)) }));
  const values = series.map((s) => s.raw);
  const peak = Math.max(m.max, ...values, 1);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const logged = values.filter((v) => v > 0).length;

  // Bars stay readable up to about a month; longer ranges switch to a line.
  const useLine = metric === 'score' || series.length > 31;
  const dense = series.length > 45; // long view: thin the dots and x labels

  // line chart geometry
  const W = 640, H = 200, PAD = 24;
  const stepX = (W - PAD * 2) / Math.max(1, series.length - 1);
  const pts = series.map((s, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - (s.raw / peak) * (H - PAD * 2);
    return { x, y, ...s };
  });
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1]?.x || PAD},${H-PAD} L${PAD},${H-PAD} Z`;

  // 7-day moving average — a smoothed trend line, shown on the longer ranges.
  const showMA = effectiveN >= 14;
  const maVals = useMemo(() => movingAverage(values, 7), [values]);
  const maLinePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${H - PAD - (maVals[i] / peak) * (H - PAD * 2)}`).join(' ');

  // x-axis labels: weekday letters when short, sparse day numbers mid-range,
  // month names on the long views.
  const xLabel = (key) => {
    if (dense) return dayNum(key) === 1 ? MONTHS_S[keyToDate(key).getMonth()] : '';
    if (effectiveN <= 14) return weekdayShort(key)[0];
    return dayNum(key) % 5 === 0 ? dayNum(key) : '·';
  };

  return (
    <div className="card trends">
      <div className="trend-head">
        <div className="metric-tabs">
          {Object.entries(metrics).map(([k, v]) => (
            <button key={k} className={`chip ${metric === k ? 'active' : ''}`} onClick={() => setMetric(k)}>{v.label}</button>
          ))}
        </div>
        <div className="range-tabs">
          {FREE_RANGES.map((r) => (
            <button key={r.n} className={`chip btn-sm ${range === r.n ? 'active' : ''}`} onClick={() => setRange(r.n)}>{r.label}</button>
          ))}
          {PLUS_RANGES.map((r) => (
            plus ? (
              <button key={r.label} className={`chip btn-sm ${range === r.n ? 'active' : ''}`} onClick={() => setRange(r.n)}>{r.label}</button>
            ) : (
              <button key={r.label} className="chip btn-sm chip-locked" onClick={openPlus} title="Pulse Plus unlocks your whole history">
                <IconLock size={11} /> {r.label}
              </button>
            )
          ))}
        </div>
      </div>

      <div className="trend-stats">
        <div><div className="ts-num" style={{ color: m.color }}>{m.fmt(Math.round(avg))}<span className="ts-unit">{m.unit}</span></div><div className="faint">average</div></div>
        <div><div className="ts-num">{m.fmt(Math.round(Math.max(...values, 0)))}<span className="ts-unit">{m.unit}</span></div><div className="faint">best</div></div>
        <div><div className="ts-num">{logged}<span className="ts-unit">/{series.length}</span></div><div className="faint">days logged</div></div>
      </div>

      {useLine ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--amber-400)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--amber-400)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25,0.5,0.75].map((g)=>(<line key={g} x1={PAD} x2={W-PAD} y1={PAD+(H-PAD*2)*g} y2={PAD+(H-PAD*2)*g} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 6"/>))}
          {metric === 'score' && <path d={areaPath} fill="url(#area)" />}
          {showMA && <path d={maLinePath} fill="none" stroke="var(--amber-700)" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" opacity="0.7" />}
          <path d={linePath} fill="none" stroke={m.color} strokeWidth={dense ? 2 : 3} strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 2000, strokeDashoffset: 0, animation: 'dash 1.1s var(--ease-out)' }} />
          {!dense && pts.map((p) => (
            <g key={p.key}>
              <circle cx={p.x} cy={p.y} r={isToday(p.key) ? 6 : 4} fill="var(--surface)" stroke={m.color} strokeWidth="3" />
            </g>
          ))}
          <style>{`@keyframes dash { from { stroke-dashoffset: 2000; } to { stroke-dashoffset: 0; } }`}</style>
        </svg>
      ) : (
        <div className="bars">
          {series.map((s) => {
            const h = Math.max(4, (s.raw / peak) * 150);
            return (
              <div key={s.key} className="bar-col">
                <div className="bar-val">{s.raw > 0 && series.length <= 21 ? m.fmt(s.raw) : ''}</div>
                <div className="bar" style={{ height: h, background: m.color, opacity: isToday(s.key) ? 1 : 0.82 }} />
              </div>
            );
          })}
          {showMA && (
            <svg className="ma-overlay" viewBox={`0 0 ${series.length} 100`} preserveAspectRatio="none">
              <polyline points={maVals.map((v, i) => `${i + 0.5},${100 - (Math.min(v, peak) / peak) * 100}`).join(' ')}
                fill="none" stroke="var(--amber-700)" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round"
                vectorEffect="non-scaling-stroke" opacity="0.75" />
            </svg>
          )}
        </div>
      )}

      {showMA && <div className="ma-key"><span className="ma-dash" /> 7-day average</div>}

      <div className="x-axis">
        {series.map((s) => (
          <span key={s.key} className={isToday(s.key) ? 'x-today' : ''}>{xLabel(s.key)}</span>
        ))}
      </div>

      {!plus && (
        <button className="trend-upsell" onClick={openPlus}>
          <IconLock size={13} /> Free shows your last {FREE_HISTORY_DAYS} days — <b>Pulse Plus</b> opens your whole history
        </button>
      )}

      <style>{`
        .trend-head { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .metric-tabs, .range-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .chip-locked { display: inline-flex; align-items: center; gap: 4px; opacity: 0.6; }
        .chip-locked:hover { opacity: 1; border-color: var(--amber-400); color: var(--amber-600); }
        .trend-stats { display: flex; gap: var(--s-6); margin-bottom: var(--s-5); }
        .ts-num { font-family: var(--font-display); font-weight: 600; font-size: 1.6rem; line-height: 1; }
        .ts-unit { font-size: 0.8rem; color: var(--text-soft); margin-left: 2px; font-family: var(--font-sans); }
        .chart { width: 100%; height: 200px; overflow: visible; }
        .bars { position: relative; display: flex; align-items: flex-end; gap: 4px; height: 178px; padding-top: 18px; }
        .ma-overlay { position: absolute; left: 0; bottom: 0; width: 100%; height: 150px; pointer-events: none; overflow: visible; }
        .ma-key { display: flex; align-items: center; gap: 7px; margin-top: 10px; font-size: var(--t-xs); color: var(--text-soft); font-weight: 600; }
        .ma-key .ma-dash { width: 22px; height: 0; border-top: 2px dashed var(--amber-700); display: inline-block; }
        .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 5px; height: 100%; }
        .bar { width: 100%; max-width: 34px; border-radius: 8px 8px 4px 4px; transition: height .6s var(--ease-out);
          animation: growBar .6s var(--ease-out) both; }
        .bar-val { font-size: 0.6rem; font-weight: 700; color: var(--text-soft); }
        @keyframes growBar { from { height: 0 !important; opacity: 0; } }
        .x-axis { display: flex; justify-content: space-between; margin-top: 8px; padding: 0 4px; }
        .x-axis span { flex: 1; text-align: center; font-size: var(--t-xs); color: var(--text-faint); font-weight: 600; white-space: nowrap; }
        .x-axis .x-today { color: var(--amber-600); }
        .trend-upsell { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;
          margin-top: var(--s-4); padding: 10px 12px; border-radius: var(--r-md); font-size: var(--t-xs); font-weight: 600;
          color: var(--text-soft); background: var(--surface-soft); border: 1px dashed var(--border);
          transition: all var(--dur-fast); }
        .trend-upsell b { color: var(--amber-600); }
        .trend-upsell:hover { border-color: var(--amber-400); color: var(--text); }
        @media (max-width: 640px) { .trend-stats { gap: var(--s-4); } .ts-num { font-size: 1.3rem; } }
      `}</style>
    </div>
  );
}
