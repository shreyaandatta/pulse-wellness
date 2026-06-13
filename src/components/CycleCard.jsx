import { isToday, prettyDate } from '../lib/dates.js';
import { SYMPTOMS, FLOW, cycleStatus, upcomingStarts, periodMoodInsight } from '../lib/cycle.js';

// Menstrual-cycle tracker (Plus). Predictions come from the days you mark as a
// period start (see lib/cycle.js); per-day flow + symptoms build your record
// and a gentle mood insight. Logs against whichever day the Day switcher shows.
export default function CycleCard({ cycle, days, dayKey, togglePeriodStart, setCycleFlow, toggleCycleSymptom, setCycleConfig, notify }) {
  const status = cycleStatus(cycle, dayKey);
  const log = cycle?.logs?.[dayKey] || { flow: 0, symptoms: [] };
  const isStart = (cycle?.starts || []).includes(dayKey);
  const onPeriod = (log.flow || 0) > 0;
  const dayWord = isToday(dayKey) ? 'today' : prettyDate(dayKey);

  // No history yet → a friendly first-run setup.
  if (!status) {
    return (
      <div className="card cycle-card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--rose)' }} /> 🌸 Cycle <span className="plus-pill">Plus</span></div>
        <p className="cyc-lead">Track your period and Pulse will predict your next one, show today's phase, and tie symptoms to how you feel.</p>
        <button className="btn btn-sm btn-primary" onClick={() => { togglePeriodStart(dayKey); notify('Period start logged — predictions are on', '🌸'); }}>
          🩸 My period started {dayWord}
        </button>
        <CycleStyle />
      </div>
    );
  }

  const { dayOfCycle, avg, phase, daysUntilNext, nextStart, fertile } = status;
  const progress = Math.min(1, dayOfCycle / avg);
  const upcoming = upcomingStarts(cycle, 3, dayKey);
  const insight = periodMoodInsight(cycle, days);

  // Ring geometry
  const R = 34, C = 2 * Math.PI * R;

  return (
    <div className="card cycle-card">
      <div className="card-title"><span className="dot" style={{ background: 'var(--rose)' }} /> 🌸 Cycle <span className="plus-pill">Plus</span></div>

      <div className="cyc-top">
        <div className="cyc-ring" style={{ '--phase': phase.color }}>
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={R} className="cyc-track" />
            <circle cx="40" cy="40" r={R} className="cyc-prog"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 40 40)" />
          </svg>
          <div className="cyc-ring-mid">
            <span className="cyc-dayn">{dayOfCycle}</span>
            <span className="cyc-dayl">day</span>
          </div>
        </div>

        <div className="cyc-meta">
          <span className="cyc-phase" style={{ '--phase': phase.color }}>{phase.emoji} {phase.label} phase</span>
          <div className="cyc-next">
            {daysUntilNext <= 0
              ? <>Period <b>expected now</b></>
              : <>Next period in <b>{daysUntilNext} {daysUntilNext === 1 ? 'day' : 'days'}</b></>}
            <span className="cyc-date">· {prettyDate(nextStart)}</span>
          </div>
          {fertile && <div className="cyc-fertile">✨ Estimated fertile window</div>}
        </div>
      </div>

      {/* Per-day logging */}
      <div className="cyc-log">
        <button className={`chip cyc-start ${isStart ? 'active' : ''}`} onClick={() => { togglePeriodStart(dayKey); notify(isStart ? 'Period start removed' : 'Period start logged', '🌸'); }}>
          🩸 {isStart ? `Period started ${dayWord} ✓` : `Period started ${dayWord}`}
        </button>

        {(onPeriod || isStart) && (
          <div className="cyc-flow">
            <span className="cyc-lbl">Flow</span>
            <div className="cyc-chips">
              {FLOW.map((f) => (
                <button key={f.v} className={`chip ${log.flow === f.v ? 'active' : ''}`} onClick={() => setCycleFlow(dayKey, log.flow === f.v ? 0 : f.v)}>
                  {f.emoji} {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <span className="cyc-lbl">How you feel {dayWord}</span>
        <div className="cyc-chips">
          {SYMPTOMS.map((s) => (
            <button key={s.id} className={`chip cyc-symptom ${log.symptoms?.includes(s.id) ? 'active' : ''}`} onClick={() => toggleCycleSymptom(dayKey, s.id)}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Look-ahead + insight */}
      <div className="cyc-foot">
        <div className="cyc-upcoming">
          <span className="cyc-lbl">Upcoming</span>
          <div className="cyc-up-list">
            {upcoming.map((u) => (
              <span key={u.key} className="cyc-up"><b>{u.label}</b><span>in {u.inDays}d</span></span>
            ))}
          </div>
        </div>
        {insight && Math.abs(insight.delta) >= 0.25 && (
          <p className="cyc-insight">
            💡 Your mood runs <b>{Math.abs(insight.delta).toFixed(1)} pts {insight.delta < 0 ? 'lower' : 'higher'}</b> on period days than the rest of your month.
          </p>
        )}
        <CycleAvg avg={cycle?.avgCycle || 28} onChange={(v) => setCycleConfig({ avgCycle: v })} />
      </div>

      <CycleStyle />
    </div>
  );
}

function CycleAvg({ avg, onChange }) {
  return (
    <div className="cyc-avg">
      <span className="cyc-lbl">Typical cycle length</span>
      <div className="cyc-stepper">
        <button className="chip" onClick={() => onChange(Math.max(18, avg - 1))} aria-label="Shorter">−</button>
        <span className="cyc-avg-val">{avg} days</span>
        <button className="chip" onClick={() => onChange(Math.min(45, avg + 1))} aria-label="Longer">+</button>
      </div>
    </div>
  );
}

function CycleStyle() {
  return (
    <style>{`
      .cyc-lead { color: var(--text-soft); font-size: var(--t-sm); line-height: 1.55; margin: 0 0 14px; }
      .cyc-top { display: flex; gap: var(--s-5); align-items: center; margin-bottom: var(--s-4); }
      .cyc-ring { position: relative; width: 84px; height: 84px; flex-shrink: 0; }
      .cyc-ring svg { width: 84px; height: 84px; transform: rotate(0deg); }
      .cyc-track { fill: none; stroke: var(--surface-soft); stroke-width: 7; }
      .cyc-prog { fill: none; stroke: var(--phase); stroke-width: 7; stroke-linecap: round;
        transition: stroke-dashoffset .7s var(--ease-out), stroke .4s; }
      .cyc-ring-mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .cyc-dayn { font-family: var(--font-display); font-weight: 700; font-size: 1.5rem; line-height: 1; color: var(--text); }
      .cyc-dayl { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); }
      .cyc-meta { flex: 1; min-width: 0; }
      .cyc-phase { display: inline-block; padding: 3px 11px; border-radius: var(--r-pill); font-size: var(--t-xs); font-weight: 700;
        color: var(--phase); background: color-mix(in srgb, var(--phase) 15%, var(--surface)); border: 1px solid color-mix(in srgb, var(--phase) 35%, var(--border)); }
      .cyc-next { margin-top: 8px; font-size: var(--t-sm); color: var(--text-soft); }
      .cyc-next b { color: var(--text); }
      .cyc-date { color: var(--text-faint); margin-left: 4px; white-space: nowrap; }
      .cyc-fertile { margin-top: 5px; font-size: var(--t-xs); font-weight: 700; color: var(--amber-600); }
      .cyc-log { border-top: 1px solid var(--border); padding-top: var(--s-4); }
      .cyc-lbl { display: block; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); margin: 10px 0 7px; }
      .cyc-chips { display: flex; flex-wrap: wrap; gap: 7px; }
      .cyc-flow { margin-top: 4px; }
      .cyc-start { font-weight: 600; }
      .cyc-start.active { background: color-mix(in srgb, var(--rose) 18%, var(--surface)); border-color: color-mix(in srgb, var(--rose) 45%, var(--border)); color: var(--rose); }
      .cyc-symptom.active, .cyc-flow .chip.active { background: color-mix(in srgb, var(--rose) 16%, var(--surface)); border-color: color-mix(in srgb, var(--rose) 42%, var(--border)); color: var(--rose); font-weight: 600; }
      .cyc-foot { border-top: 1px solid var(--border); margin-top: var(--s-4); padding-top: var(--s-3); }
      .cyc-up-list { display: flex; flex-wrap: wrap; gap: 8px; }
      .cyc-up { display: flex; flex-direction: column; padding: 6px 11px; border-radius: var(--r-md, 12px); background: var(--surface-soft); border: 1px solid var(--border); }
      .cyc-up b { font-size: var(--t-sm); color: var(--text); }
      .cyc-up span { font-size: 0.62rem; color: var(--text-faint); font-weight: 600; }
      .cyc-insight { font-size: var(--t-sm); color: var(--text-soft); line-height: 1.5; margin: 12px 0 0; }
      .cyc-insight b { color: var(--text); }
      .cyc-avg { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
      .cyc-avg .cyc-lbl { margin: 0; }
      .cyc-stepper { display: flex; align-items: center; gap: 8px; }
      .cyc-avg-val { font-size: var(--t-sm); font-weight: 700; color: var(--text); min-width: 56px; text-align: center; }
    `}</style>
  );
}
