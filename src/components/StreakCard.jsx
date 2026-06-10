import { IconFire } from './Icons.jsx';
import { currentStreak, bestStreak, dayCounts } from '../lib/streak.js';
import { lastNDays, weekdayShort, isToday } from '../lib/dates.js';

export default function StreakCard({ state }) {
  const cur = currentStreak(state);
  const best = bestStreak(state);
  const week = lastNDays(7);

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
