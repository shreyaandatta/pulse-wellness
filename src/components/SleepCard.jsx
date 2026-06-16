import { useEffect, useRef, useState } from 'react';
import { IconMoon } from './Icons.jsx';
import { useGoalCelebration } from '../hooks/useGoalCelebration.js';

// Duration (hours, 1 decimal) from a bedtime → wake-up pair. Wake earlier than
// bedtime means you slept across midnight, so we wrap by a day.
function hoursFromTimes(bed, wake) {
  if (!bed || !wake) return null;
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins <= 0) mins += 1440;
  return Math.round((mins / 60) * 10) / 10;
}

// 'HH:MM' (24h) → friendly '11:00 PM'.
function fmt12(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

export default function SleepCard({ day, dayKey, goals, onSet, onSetQuality, onSetTimes, notify }) {
  const hours = day.sleep ?? 0;
  const cardRef = useRef(null);

  // Bedtime / wake live in local state seeded from the day, re-seeded when the
  // viewed day changes so reviewing a past night shows that night's times.
  const [bed, setBed] = useState(day.bedtime || '');
  const [wake, setWake] = useState(day.waketime || '');
  useEffect(() => { setBed(day.bedtime || ''); setWake(day.waketime || ''); }, [dayKey, day.bedtime, day.waketime]);

  const applyTimes = (b, w) => {
    setBed(b); setWake(w);
    const h = hoursFromTimes(b, w);
    onSetTimes(b || null, w || null, h != null ? h : (day.sleep ?? null));
    if (h != null) notify(`Slept ${h.toFixed(1)}h`, '🌙');
  };

  // Manual hours (slider) — clears any times so the number and the times agree.
  const setHours = (h) => {
    onSet(+h.toFixed(1));
    setBed(''); setWake('');
    if (h > 0) notify(`Sleep set to ${h.toFixed(1)}h`, '🌙');
  };

  const pct = Math.min(100, (hours / Math.max(1, goals.sleep)) * 100);
  const reached = hours >= goals.sleep;
  const hasTimes = bed && wake;

  useGoalCelebration(reached, dayKey, cardRef, () => notify('Sleep goal met — well rested!', '🎉'));

  return (
    <div className="card" ref={cardRef}>
      <div className="card-title"><span className="dot" style={{ background: 'var(--plum)' }} /><IconMoon size={15} /> Sleep</div>

      <div className="sleep-readout">
        <span className="stat-big">{hours ? hours.toFixed(1) : '—'}</span>
        <span className="stat-unit">hrs</span>
        <span className="faint" style={{ marginLeft: 'auto' }}>goal {goals.sleep}h</span>
      </div>
      {hasTimes && <div className="sleep-times-sub">🛏 {fmt12(bed)} → {fmt12(wake)} 🌅</div>}

      {/* Primary: bedtime → wake. Native time pickers; duration is derived. */}
      <div className="sleep-time-row">
        <label className="sleep-time">
          <span>Bedtime</span>
          <input className="input" type="time" value={bed} onChange={(e) => applyTimes(e.target.value, wake)} />
        </label>
        <span className="sleep-arrow">→</span>
        <label className="sleep-time">
          <span>Wake up</span>
          <input className="input" type="time" value={wake} onChange={(e) => applyTimes(bed, e.target.value)} />
        </label>
      </div>

      {/* Fallback: just set the hours directly. */}
      <details className="sleep-manual">
        <summary>or enter hours directly</summary>
        <input className="input sleep-range" type="range" min="0" max="12" step="0.5"
          value={hours} onChange={(e) => setHours(Number(e.target.value))} />
        <div className="scale-marks"><span>0</span><span>{goals.sleep}</span><span>12</span></div>
      </details>

      <div className="progress-track" style={{ marginTop: 10 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--plum), #B79BD0)' }} />
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label>Sleep quality</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['😴','Poor'],['😐','Ok'],['🙂','Good'],['😌','Great'],['🤩','Best']].map(([e, lbl], i) => (
            <button key={lbl} className={`chip ${day.sleepQuality === i + 1 ? 'active' : ''}`} onClick={() => onSetQuality(i + 1)}
              style={{ flexDirection: 'column', flex: 1, gap: 2, padding: '8px 2px' }}>
              <span style={{ fontSize: '1.1rem' }}>{e}</span>
              <span style={{ fontSize: '0.62rem' }}>{lbl}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .sleep-readout { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
        .sleep-times-sub { font-size: var(--t-xs); font-weight: 600; color: var(--text-soft); margin-bottom: 10px; }
        .sleep-time-row { display: flex; align-items: flex-end; gap: 10px; margin-top: 6px; }
        .sleep-time { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .sleep-time span { font-size: var(--t-xs); font-weight: 600; color: var(--text-soft); }
        .sleep-time .input { padding: 9px 10px; font-variant-numeric: tabular-nums; }
        .sleep-arrow { color: var(--text-faint); font-weight: 700; padding-bottom: 10px; }
        .sleep-manual { margin-top: 12px; }
        .sleep-manual summary { font-size: var(--t-xs); font-weight: 600; color: var(--text-faint); cursor: pointer; list-style: none; }
        .sleep-manual summary::-webkit-details-marker { display: none; }
        .sleep-manual summary:hover { color: var(--text-soft); }
        .sleep-range { accent-color: var(--plum); padding: 0; height: 8px; margin-top: 10px; }
        .scale-marks { display: flex; justify-content: space-between; font-size: var(--t-xs); color: var(--text-faint); margin-top: 4px; }
      `}</style>
    </div>
  );
}
