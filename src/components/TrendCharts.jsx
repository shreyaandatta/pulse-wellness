import { useState, useMemo } from 'react';
import { lastNDays, weekdayShort, dayNum, isToday } from '../lib/dates.js';
import { getDay } from '../lib/storage.js';
import { dayScore } from '../lib/score.js';
import { mlToDisplay } from '../lib/units.js';

const RANGES = [7, 14, 30];

export default function TrendCharts({ state, units }) {
  const [metric, setMetric] = useState('score');
  const [range, setRange] = useState(7);
  const days = useMemo(() => lastNDays(range), [range]);

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

  // line chart geometry for score
  const W = 640, H = 200, PAD = 24;
  const stepX = (W - PAD * 2) / Math.max(1, series.length - 1);
  const pts = series.map((s, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - (s.raw / peak) * (H - PAD * 2);
    return { x, y, ...s };
  });
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1]?.x || PAD},${H-PAD} L${PAD},${H-PAD} Z`;

  return (
    <div className="card trends">
      <div className="trend-head">
        <div className="metric-tabs">
          {Object.entries(metrics).map(([k, v]) => (
            <button key={k} className={`chip ${metric === k ? 'active' : ''}`} onClick={() => setMetric(k)}>{v.label}</button>
          ))}
        </div>
        <div className="range-tabs">
          {RANGES.map((r) => (
            <button key={r} className={`chip btn-sm ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}d</button>
          ))}
        </div>
      </div>

      <div className="trend-stats">
        <div><div className="ts-num" style={{ color: m.color }}>{m.fmt(Math.round(avg))}<span className="ts-unit">{m.unit}</span></div><div className="faint">average</div></div>
        <div><div className="ts-num">{m.fmt(Math.round(Math.max(...values, 0)))}<span className="ts-unit">{m.unit}</span></div><div className="faint">best</div></div>
        <div><div className="ts-num">{logged}<span className="ts-unit">/{range}</span></div><div className="faint">days logged</div></div>
      </div>

      {metric === 'score' ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--amber-400)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--amber-400)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25,0.5,0.75].map((g)=>(<line key={g} x1={PAD} x2={W-PAD} y1={PAD+(H-PAD*2)*g} y2={PAD+(H-PAD*2)*g} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 6"/>))}
          <path d={areaPath} fill="url(#area)" />
          <path d={linePath} fill="none" stroke="var(--amber-500)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 2000, strokeDashoffset: 0, animation: 'dash 1.1s var(--ease-out)' }} />
          {pts.map((p) => (
            <g key={p.key}>
              <circle cx={p.x} cy={p.y} r={isToday(p.key) ? 6 : 4} fill="var(--surface)" stroke="var(--amber-500)" strokeWidth="3" />
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
                <div className="bar-val">{s.raw > 0 ? m.fmt(s.raw) : ''}</div>
                <div className="bar" style={{ height: h, background: m.color, opacity: isToday(s.key) ? 1 : 0.82 }} />
              </div>
            );
          })}
        </div>
      )}

      <div className="x-axis">
        {series.map((s) => (
          <span key={s.key} className={isToday(s.key) ? 'x-today' : ''}>
            {range <= 14 ? weekdayShort(s.key)[0] : (dayNum(s.key) % 5 === 0 ? dayNum(s.key) : '·')}
          </span>
        ))}
      </div>

      <style>{`
        .trend-head { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .metric-tabs, .range-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .trend-stats { display: flex; gap: var(--s-6); margin-bottom: var(--s-5); }
        .ts-num { font-family: var(--font-display); font-weight: 600; font-size: 1.6rem; line-height: 1; }
        .ts-unit { font-size: 0.8rem; color: var(--text-soft); margin-left: 2px; font-family: var(--font-sans); }
        .chart { width: 100%; height: 200px; overflow: visible; }
        .bars { display: flex; align-items: flex-end; gap: 4px; height: 178px; padding-top: 18px; }
        .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 5px; height: 100%; }
        .bar { width: 100%; max-width: 34px; border-radius: 8px 8px 4px 4px; transition: height .6s var(--ease-out);
          animation: growBar .6s var(--ease-out) both; }
        .bar-val { font-size: 0.6rem; font-weight: 700; color: var(--text-soft); }
        @keyframes growBar { from { height: 0 !important; opacity: 0; } }
        .x-axis { display: flex; justify-content: space-between; margin-top: 8px; padding: 0 4px; }
        .x-axis span { flex: 1; text-align: center; font-size: var(--t-xs); color: var(--text-faint); font-weight: 600; }
        .x-axis .x-today { color: var(--amber-600); }
        @media (max-width: 640px) { .trend-stats { gap: var(--s-4); } .ts-num { font-size: 1.3rem; } }
      `}</style>
    </div>
  );
}
