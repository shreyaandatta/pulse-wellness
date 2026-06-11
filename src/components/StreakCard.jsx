import { IconFire } from './Icons.jsx';
import { currentStreak, bestStreak, dayCounts } from '../lib/streak.js';
import { lastNDays, weekdayShort, isToday, todayKey } from '../lib/dates.js';
import { goalsHit } from '../lib/score.js';
import { getDay } from '../lib/storage.js';

export default function StreakCard({ state }) {
  const cur = currentStreak(state);
  const best = bestStreak(state);
  const week = lastNDays(7);
  const g = goalsHit(getDay(state, todayKey()), state.goals);

  return (
    <div className="card streak-card">
      <div className="card-title"><span className="dot" style={{ background: 'var(--amber-500)' }} /><IconFire size={15} /> Streak</div>

      <div className="streak-main">
        <div className={`flame ${cur > 0 ? 'lit' : ''}`}>🔥</div>
        <div>
          <div className="streak-num">{cur}<span className="streak-day">{cur === 1 ? 'day' : 'days'}</span></div>
          <div className="faint">Best: {best} {best === 1 ? 'day' : 'days'}</div>
        </div>
      </div>

      <div className="goals-today">
        <div className="gt-head">
          <span className="gt-label">🎯 Goals today</span>
          <span className="gt-count"><b className={g.hit === g.total ? 'all' : ''}>{g.hit}</b> / {g.total}</span>
        </div>
        <div className="gt-pips">
          {g.checks.map((c) => <span key={c.id} className={`gt-pip ${c.met ? 'met' : ''}`} />)}
        </div>
        {g.hit === g.total && <div className="gt-allhit">All goals hit — beautiful day 🌟</div>}
      </div>

      <div className="week-dots">
        {week.map((k) => {
          const done = dayCounts(state, k);
          return (
            <div key={k} className="wd">
              <div className={`wd-dot ${done ? 'done' : ''} ${isToday(k) ? 'today' : ''}`}>
                {done ? '🔥' : ''}
              </div>
              <span className="wd-label">{weekdayShort(k)[0]}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        .streak-main { display: flex; align-items: center; gap: var(--s-4); margin-bottom: var(--s-5); }
        .flame { font-size: 2.6rem; filter: grayscale(1) opacity(0.4); transition: filter var(--dur); }
        .flame.lit { filter: none; animation: flicker 2.2s ease-in-out infinite; }
        .streak-num { font-family: var(--font-display); font-weight: 600; font-size: 2.6rem; line-height: 1; }
        .streak-day { font-size: var(--t-md); color: var(--text-soft); margin-left: 6px; font-family: var(--font-sans); }
        .goals-today { margin-bottom: var(--s-5); }
        .gt-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .gt-label { font-size: var(--t-sm); font-weight: 600; color: var(--text-soft); }
        .gt-count { font-size: var(--t-sm); color: var(--text-soft); font-variant-numeric: tabular-nums; }
        .gt-count b { font-family: var(--font-display); font-size: 1.05rem; color: var(--text); }
        .gt-count b.all { color: var(--good); }
        .gt-pips { display: flex; gap: 6px; }
        .gt-pip { flex: 1; height: 8px; border-radius: 99px; background: var(--surface-soft);
          border: 1px solid var(--border); transition: all var(--dur) var(--ease-spring); }
        .gt-pip.met { background: linear-gradient(90deg, var(--honey-400), var(--amber-500)); border-color: var(--amber-400);
          box-shadow: 0 0 0 2px rgba(240,174,56,0.15); }
        .gt-allhit { margin-top: 8px; font-size: var(--t-xs); font-weight: 600; color: var(--good); }
        .week-dots { display: flex; justify-content: space-between; gap: 6px; }
        .wd { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .wd-dot { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
          background: var(--surface-soft); border: 1px solid var(--border); font-size: 0.85rem; transition: all var(--dur) var(--ease-spring); }
        .wd-dot.done { background: linear-gradient(135deg, var(--honey-300), var(--amber-400)); border-color: var(--amber-400); }
        .wd-dot.today { box-shadow: 0 0 0 3px rgba(240,174,56,0.25); }
        .wd-label { font-size: var(--t-xs); color: var(--text-faint); font-weight: 600; }
      `}</style>
    </div>
  );
}
