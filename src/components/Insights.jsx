import {
  weeklyRecap, periodSummary, correlations, weekdayRhythm,
  personalRecords, dataDepth, METRIC_LABEL,
} from '../lib/insights.js';

const WD_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const UNLOCK_CORR = 8;

export default function Insights({ state, units }) {
  const goals = state.goals;
  const depth = dataDepth(state);

  if (depth === 0) {
    return (
      <div className="card insights-empty">
        <div className="ie-emoji">📊</div>
        <h3>Your insights start here</h3>
        <p className="faint">Log a few days and Pulse will surface the patterns — what lifts your mood, your strongest day of the week, your personal bests, and a weekly recap written from your own data.</p>
      </div>
    );
  }

  const recap = weeklyRecap(state, goals);
  const { week, month } = periodSummary(state, goals);
  const links = correlations(state);
  const rhythm = weekdayRhythm(state, goals);
  const records = personalRecords(state, goals, units);

  return (
    <div className="insights stagger">
      {/* SIGNATURE: a written weekly recap */}
      {recap.hasData && (
        <div className="card recap">
          <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /> Your week, in a sentence</div>
          <p className="recap-text">
            {recap.tokens.map((tok, i) => (
              <span key={i} className={tok.em ? `em em-${tok.em}` : ''}>{tok.text}</span>
            ))}
          </p>
        </div>
      )}

      {/* This week / this month deltas */}
      <div className="cols">
        <PeriodCard title="This week" data={week} />
        <PeriodCard title="This month" data={month} />
      </div>

      {/* Correlations */}
      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--rose)' }} /> What's linked</div>
        {links.length ? (
          <div className="links">
            {links.map((l, i) => (
              <div className="link-row" key={i}>
                <div className="link-head">
                  <span className="link-pair">{l.pair}</span>
                  <span className={`link-chip ${l.weight >= 0.5 ? 'strong' : ''}`}>{l.label}</span>
                </div>
                <div className="link-meter"><div className="link-fill" style={{ width: `${Math.round(Math.min(1, Math.abs(l.r)) * 100)}%` }} /></div>
                <p className="faint link-sentence">{l.sentence}</p>
              </div>
            ))}
            <p className="faint corr-note">Patterns in your own days — a link isn't proof of cause, just a tendency worth noticing.</p>
          </div>
        ) : (
          <p className="faint">Links unlock once you've logged about {UNLOCK_CORR} days with sleep, mood and movement filled in. You're at {depth}. Keep going — they're worth the wait.</p>
        )}
      </div>

      {/* Weekday rhythm */}
      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--water)' }} /> Your weekly rhythm</div>
        {rhythm.best ? (
          <>
            <p className="faint" style={{ marginBottom: 14 }}>
              Average wellness by weekday. Your strongest day is usually <b style={{ color: 'var(--text)' }}>{rhythm.best.name}</b>.
            </p>
            <div className="rhythm">
              {rhythm.avgs.map((v, i) => {
                const h = v == null ? 4 : Math.max(6, (v / 100) * 96);
                const isBest = rhythm.best && i === rhythm.best.dow;
                return (
                  <div className="r-col" key={i} title={v == null ? 'No data' : `${WD_SHORT[i]} · avg ${Math.round(v)}`}>
                    <div className="r-val">{v == null ? '' : Math.round(v)}</div>
                    <div className={`r-bar ${isBest ? 'best' : ''}`} style={{ height: h }} />
                    <div className="r-lbl">{WD_SHORT[i]}</div>
                  </div>
                );
              })}
            </div>
          </>
        ) : <p className="faint">Log a few more days to see which weekday treats you best.</p>}
      </div>

      {/* Personal records */}
      <div className="card">
        <div className="card-title"><span className="dot" style={{ background: 'var(--clay)' }} /> Personal records</div>
        <div className="records">
          {records.map((r, i) => (
            <div className="record" key={i}>
              <span className="rec-emoji">{r.emoji}</span>
              <div className="rec-body">
                <div className="rec-val">{r.value}</div>
                <div className="rec-lbl">{r.label}</div>
                {r.date && <div className="rec-date faint">{r.date}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .insights { display: flex; flex-direction: column; gap: var(--s-5); }
        .cols { display: grid; gap: var(--s-5); grid-template-columns: 1fr; }
        @media (min-width: 720px) { .cols { grid-template-columns: 1fr 1fr; } }

        .insights-empty { text-align: center; padding: var(--s-10) var(--s-6); }
        .ie-emoji { font-size: 2.4rem; margin-bottom: 10px; }
        .insights-empty h3 { font-family: var(--font-display); font-weight: 600; font-size: var(--t-md); margin-bottom: 8px; }
        .insights-empty p { max-width: 44ch; margin: 0 auto; line-height: 1.55; }

        /* signature recap */
        .recap { background: linear-gradient(160deg, var(--surface), color-mix(in srgb, var(--amber-100) 34%, var(--surface))); }
        .recap-text { font-family: var(--font-display); font-weight: 500; font-size: 1.45rem; line-height: 1.5; letter-spacing: -0.01em; }
        @media (min-width: 720px) { .recap-text { font-size: 1.7rem; } }
        .recap-text .em { font-weight: 600; }
        .recap-text .em-good { color: var(--good); }
        .recap-text .em-bad { color: var(--clay); }
        .recap-text .em-em { color: var(--amber-600); }

        /* period cards */
        .period-score { display: flex; align-items: baseline; gap: 10px; margin: 4px 0 14px; }
        .ps-num { font-family: var(--font-display); font-weight: 600; font-size: 2.3rem; line-height: 1; }
        .delta { font-weight: 700; font-size: var(--t-sm); display: inline-flex; align-items: center; gap: 2px; }
        .delta.up { color: var(--good); } .delta.down { color: var(--clay); } .delta.flat { color: var(--text-faint); }
        .pm-grid { display: flex; flex-direction: column; gap: 8px; }
        .pm-row { display: flex; align-items: center; justify-content: space-between; font-size: var(--t-sm); }
        .pm-row .pm-label { color: var(--text-soft); font-weight: 600; }
        .pm-row .delta { font-size: var(--t-xs); }
        .period-empty { color: var(--text-faint); font-size: var(--t-sm); }

        /* correlations */
        .links { display: flex; flex-direction: column; gap: 16px; }
        .link-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .link-pair { font-weight: 700; font-size: var(--t-sm); }
        .link-chip { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
          padding: 3px 8px; border-radius: 99px; background: var(--surface-soft); color: var(--text-soft); }
        .link-chip.strong { background: linear-gradient(135deg, var(--amber-100), var(--amber-200)); color: var(--amber-800); }
        .link-meter { height: 6px; border-radius: 99px; background: var(--surface-soft); overflow: hidden; }
        .link-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--rose), var(--amber-500));
          animation: growW .8s var(--ease-out) both; }
        @keyframes growW { from { width: 0 !important; } }
        .link-sentence { margin-top: 7px; line-height: 1.45; }
        .corr-note { margin-top: 4px; font-size: var(--t-xs); font-style: italic; }

        /* weekday rhythm */
        .rhythm { display: flex; align-items: flex-end; gap: 8px; height: 130px; }
        .r-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; height: 100%; }
        .r-val { font-size: 0.62rem; font-weight: 700; color: var(--text-soft); }
        .r-bar { width: 100%; max-width: 38px; border-radius: 8px 8px 4px 4px; background: var(--surface-soft);
          animation: growBar .6s var(--ease-out) both; }
        .r-bar.best { background: linear-gradient(180deg, var(--amber-400), var(--amber-600)); box-shadow: var(--shadow-glow); }
        .r-lbl { font-size: var(--t-xs); font-weight: 600; color: var(--text-faint); }

        /* records */
        .records { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (min-width: 720px) { .records { grid-template-columns: repeat(3, 1fr); } }
        .record { display: flex; gap: 12px; align-items: center; padding: 14px; border-radius: var(--r-md);
          background: var(--surface-soft); border: 1px solid var(--border); }
        .rec-emoji { font-size: 1.5rem; }
        .rec-val { font-family: var(--font-display); font-weight: 600; font-size: 1.2rem; line-height: 1.1; }
        .rec-lbl { font-size: var(--t-xs); color: var(--text-soft); font-weight: 600; }
        .rec-date { font-size: 0.62rem; margin-top: 2px; }
      `}</style>
    </div>
  );
}

function Delta({ value, unit = '', invert = false }) {
  if (value == null) return <span className="delta flat">— new</span>;
  const r = Math.round(value);
  if (r === 0) return <span className="delta flat">no change</span>;
  const good = invert ? r < 0 : r > 0;
  return <span className={`delta ${good ? 'up' : 'down'}`}>{r > 0 ? '↑' : '↓'} {Math.abs(r)}{unit}</span>;
}

function PeriodCard({ title, data }) {
  const s = data.metrics.score;
  return (
    <div className="card">
      <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /> {title}</div>
      {data.loggedCur === 0 ? (
        <p className="period-empty">Nothing logged in this window yet.</p>
      ) : (
        <>
          <div className="period-score">
            <span className="ps-num">{s.cur != null ? Math.round(s.cur) : '—'}</span>
            <Delta value={s.delta} />
            <span className="faint" style={{ fontSize: 'var(--t-xs)' }}>avg wellness · {data.loggedCur} {data.loggedCur === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="pm-grid">
            {['sleep', 'movement', 'steps', 'mood'].map((m) => (
              <div className="pm-row" key={m}>
                <span className="pm-label">{METRIC_LABEL[m]}</span>
                <Delta value={data.metrics[m].norm != null ? data.metrics[m].norm * 100 : null} unit="%" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
