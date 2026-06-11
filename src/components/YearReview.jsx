import { useMemo, useState } from 'react';
import { todayKey, addDays, prettyDate } from '../lib/dates.js';
import { getDay } from '../lib/storage.js';
import { dayScore, scoreBand } from '../lib/score.js';
import { dayCounts } from '../lib/streak.js';
import { IconSparkle, IconLock } from './Icons.jsx';

const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Year in review — a Plus look-back at any year you've tracked: the headline
// numbers, the best moments, and a month-by-month shape of the year.
export default function YearReview({ state, plus, openPlus }) {
  if (!plus) return <Teaser openPlus={openPlus} />;
  return <Review state={state} />;
}

function Teaser({ openPlus }) {
  return (
    <div className="card yr-teaser">
      <div className="yr-tease-mark"><IconSparkle size={24} /></div>
      <div className="yr-tease-body">
        <div className="yr-tease-title">Year in review <span className="plus-pill">Plus</span></div>
        <p className="faint">Your whole year, told back to you — total litres, steps and active hours, your best day and longest streak, month by month.</p>
      </div>
      <button className="btn btn-sm btn-primary" onClick={openPlus}><IconLock size={14} /> Unlock</button>
      <YrStyle />
    </div>
  );
}

function Review({ state }) {
  const years = useMemo(() => {
    const ys = [...new Set(Object.keys(state.days).map((k) => k.slice(0, 4)))].sort().reverse();
    return ys.length ? ys : [todayKey().slice(0, 4)];
  }, [state.days]);
  const [year, setYear] = useState(years[0]);
  const r = useMemo(() => computeYear(state, year), [state, year]);
  const maxMonth = Math.max(...r.months.map((m) => m.avg), 1);

  return (
    <div className="card yr">
      <div className="yr-head">
        <div className="card-title" style={{ marginBottom: 0 }}>
          <span className="dot" style={{ background: 'var(--clay)' }} /> Year in review <span className="plus-pill">Plus</span>
        </div>
        <div className="yr-years">
          {years.map((y) => (
            <button key={y} className={`chip btn-sm ${year === y ? 'active' : ''}`} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
      </div>

      {r.daysLogged === 0 ? (
        <p className="faint" style={{ padding: 'var(--s-4) 0' }}>Nothing logged in {year} yet — your review will write itself as you go.</p>
      ) : (
        <>
          <div className="yr-hero">
            <Big label="days logged" value={r.daysLogged} />
            <Big label="average score" value={r.avgScore} suffix={r.band.emoji} />
            <Big label="longest streak" value={r.bestStreak} suffix="days" />
            <Big label="goals hit" value="" custom={`${r.thriving} thriving ${r.thriving === 1 ? 'day' : 'days'}`} />
          </div>

          <div className="yr-months">
            {r.months.map((m, i) => (
              <div className="yr-mcol" key={i} title={m.logged ? `${MONTHS_S[i]} · avg ${m.avg}` : `${MONTHS_S[i]} · no entries`}>
                <div className="yr-mbar-track">
                  <div className="yr-mbar" style={{ height: `${(m.avg / maxMonth) * 100}%`, opacity: m.logged ? 1 : 0.18 }} />
                </div>
                <span className="yr-mlabel">{MONTHS_S[i][0]}</span>
              </div>
            ))}
          </div>
          <div className="faint yr-mcap">average wellness score by month</div>

          <div className="yr-chips">
            {r.bestDay && <span className="yr-chip">🏆 Best day {prettyDate(r.bestDay.key)} · {r.bestDay.score}</span>}
            <span className="yr-chip">💧 {r.waterL.toLocaleString()} L</span>
            <span className="yr-chip">👟 {r.steps.toLocaleString()} steps</span>
            <span className="yr-chip">🔥 {Math.round(r.activeMin / 60).toLocaleString()} active hours</span>
            <span className="yr-chip">🥗 {r.meals.toLocaleString()} meals</span>
          </div>
        </>
      )}
      <YrStyle />
    </div>
  );
}

function Big({ label, value, suffix, custom }) {
  return (
    <div className="yr-big">
      <div className="yr-num">{custom || <>{value}{suffix && <span className="yr-suffix"> {suffix}</span>}</>}</div>
      <div className="faint yr-lbl">{label}</div>
    </div>
  );
}

function computeYear(state, year) {
  const start = `${year}-01-01`;
  const today = todayKey();
  const end = `${year}-12-31` < today ? `${year}-12-31` : today;

  let daysLogged = 0, scoreSum = 0, waterMl = 0, steps = 0, activeMin = 0, meals = 0, thriving = 0;
  let bestDay = null, bestStreak = 0, run = 0;
  const months = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));

  let cursor = start;
  while (cursor <= end) {
    if (state.days[cursor]) {
      const d = getDay(state, cursor);
      const score = dayScore(d, state.goals);
      daysLogged++; scoreSum += score;
      waterMl += d.water || 0;
      steps += d.steps || 0;
      activeMin += (d.workouts || []).reduce((s, w) => s + (w.minutes || 0), 0);
      meals += (d.meals || []).length;
      if (score >= 80) thriving++;
      if (!bestDay || score > bestDay.score) bestDay = { key: cursor, score };
      const mo = Number(cursor.slice(5, 7)) - 1;
      months[mo].sum += score; months[mo].n++;
    }
    // streak uses the same "good day" gate as the streak card
    if (dayCounts(state, cursor)) { run++; bestStreak = Math.max(bestStreak, run); }
    else run = 0;
    cursor = addDays(cursor, 1);
  }

  const avgScore = daysLogged ? Math.round(scoreSum / daysLogged) : 0;
  return {
    daysLogged, avgScore, band: scoreBand(avgScore), bestDay, bestStreak, thriving,
    waterL: Math.round(waterMl / 1000), steps, activeMin, meals,
    months: months.map((m) => ({ avg: m.n ? Math.round(m.sum / m.n) : 0, logged: m.n > 0 })),
  };
}

function YrStyle() {
  return (
    <style>{`
      .yr-teaser { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
      .yr-tease-mark { width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0; display: grid; place-items: center;
        color: #fff; background: linear-gradient(140deg, var(--amber-400), var(--clay)); box-shadow: var(--shadow-glow); }
      .yr-tease-body { flex: 1; min-width: 200px; }
      .yr-tease-title { display: flex; align-items: center; gap: 8px; font-weight: 700; margin-bottom: 4px; }
      .yr-teaser .faint { font-size: var(--t-sm); line-height: 1.5; }

      .yr-head { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; margin-bottom: var(--s-5); }
      .yr-years { display: flex; gap: 6px; flex-wrap: wrap; }

      .yr-hero { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: var(--s-4); margin-bottom: var(--s-5); }
      .yr-big { background: var(--surface-soft); border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px 14px; }
      .yr-num { font-family: var(--font-display); font-weight: 600; font-size: 1.45rem; line-height: 1.2; }
      .yr-suffix { font-size: 0.85rem; color: var(--text-soft); font-family: var(--font-sans); }
      .yr-lbl { font-size: var(--t-xs); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; margin-top: 2px; }

      .yr-months { display: flex; gap: 6px; align-items: flex-end; height: 90px; margin-top: 4px; }
      .yr-mcol { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
      .yr-mbar-track { flex: 1; width: 100%; max-width: 30px; display: flex; align-items: flex-end; }
      .yr-mbar { width: 100%; border-radius: 6px 6px 3px 3px; min-height: 3px;
        background: linear-gradient(var(--amber-400), var(--amber-600)); transition: height .5s var(--ease-out); }
      .yr-mlabel { font-size: 0.6rem; font-weight: 700; color: var(--text-faint); }
      .yr-mcap { font-size: var(--t-xs); margin-top: 6px; }

      .yr-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: var(--s-4); }
      .yr-chip { font-size: var(--t-xs); font-weight: 600; color: var(--text-soft); background: var(--surface-soft);
        border: 1px solid var(--border); padding: 5px 11px; border-radius: var(--r-pill); }
    `}</style>
  );
}
