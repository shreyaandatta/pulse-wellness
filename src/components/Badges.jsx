import { useState, useRef, useEffect } from 'react';
import { resolveBadges, BADGE_CATEGORIES } from '../lib/badges.js';
import { celebrate } from '../lib/celebrate.js';

// The "trophy case": every achievement the user can earn from their own data.
// Collapsed it shows what's unlocked plus the next carrot; expanded it shows the
// full catalogue grouped by category. New unlocks during a session pop confetti.
export default function Badges({ state, notify }) {
  const { badges, earnedCount, total, next } = resolveBadges(state);
  const [open, setOpen] = useState(false);
  const cardRef = useRef(null);

  // Celebrate only badges that flip to earned *during this session*. The ref is
  // seeded on first render so we never confetti the whole case on page load.
  const earnedIds = badges.filter((b) => b.earned).map((b) => b.id);
  const seen = useRef(null);
  const key = earnedIds.join(',');
  useEffect(() => {
    if (seen.current === null) { seen.current = new Set(earnedIds); return; }
    const fresh = earnedIds.filter((id) => !seen.current.has(id));
    if (fresh.length) {
      celebrate(cardRef.current, 36);
      const b = badges.find((x) => x.id === fresh[fresh.length - 1]);
      if (b && notify) notify(`Badge unlocked — ${b.title}`, b.emoji);
      fresh.forEach((id) => seen.current.add(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const earned = badges.filter((b) => b.earned);
  const allDone = earnedCount === total;

  return (
    <div className="card badges-card" ref={cardRef}>
      <div className="card-title">
        <span className="dot" style={{ background: 'var(--honey-400)' }} />🏅 Achievements
        <span className="bdg-count">{earnedCount}/{total}</span>
      </div>

      {/* Next-up carrot, or a victory line when everything's unlocked. */}
      {allDone ? (
        <div className="bdg-alldone">Every badge unlocked — what a run 🎉</div>
      ) : next && (
        <div className="bdg-next">
          <div className="bdg-next-head">
            <span className="bdg-next-emoji">{next.emoji}</span>
            <div className="bdg-next-text">
              <b>Next: {next.title}</b>
              <span className="faint">{next.desc}</span>
            </div>
            <span className="bdg-next-prog">{next.progressLabel}</span>
          </div>
          <div className="bdg-bar"><div className="bdg-bar-fill" style={{ width: `${Math.round(next.progress * 100)}%` }} /></div>
        </div>
      )}

      {/* Collapsed: just the medals you've earned. Expanded: the whole case. */}
      {!open && earned.length > 0 && (
        <div className="bdg-grid">
          {earned.map((b) => <Medal key={b.id} b={b} />)}
        </div>
      )}
      {!open && earned.length === 0 && (
        <p className="faint bdg-empty">No badges yet — log a few days and they’ll start appearing.</p>
      )}

      {open && BADGE_CATEGORIES.map((cat) => {
        const group = badges.filter((b) => b.cat === cat);
        return (
          <div key={cat} className="bdg-section">
            <div className="bdg-cat">{cat}</div>
            <div className="bdg-grid">
              {group.map((b) => <Medal key={b.id} b={b} showLock />)}
            </div>
          </div>
        );
      })}

      <button className="bdg-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? 'Show less' : `See all ${total} badges`}
      </button>

      <style>{`
        .badges-card { display: flex; flex-direction: column; }
        .bdg-count { margin-left: auto; font-size: var(--t-sm); color: var(--text-soft);
          font-variant-numeric: tabular-nums; font-family: var(--font-display); }
        .bdg-next { background: var(--surface-soft); border: 1px solid var(--border);
          border-radius: var(--r-md); padding: 10px 12px; margin-bottom: var(--s-4); }
        .bdg-next-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .bdg-next-emoji { font-size: 1.5rem; filter: grayscale(1) opacity(0.55); }
        .bdg-next-text { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
        .bdg-next-text b { font-size: var(--t-sm); }
        .bdg-next-text .faint { font-size: var(--t-xs); }
        .bdg-next-prog { margin-left: auto; font-size: var(--t-xs); color: var(--text-soft);
          font-variant-numeric: tabular-nums; white-space: nowrap; }
        .bdg-bar { height: 7px; border-radius: 99px; background: var(--surface); overflow: hidden;
          border: 1px solid var(--border); }
        .bdg-bar-fill { height: 100%; border-radius: 99px;
          background: linear-gradient(90deg, var(--honey-400), var(--amber-500));
          transition: width var(--dur) var(--ease-spring); }
        .bdg-alldone { font-size: var(--t-sm); font-weight: 600; color: var(--good);
          margin-bottom: var(--s-4); }
        .bdg-empty { margin: 4px 0 var(--s-4); font-size: var(--t-sm); }
        .bdg-section { margin-bottom: var(--s-4); }
        .bdg-cat { font-size: var(--t-xs); font-weight: 700; letter-spacing: 0.04em;
          text-transform: uppercase; color: var(--text-faint); margin-bottom: 8px; }
        .bdg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
          gap: 10px; }
        .bdg-toggle { margin-top: auto; align-self: flex-start; background: none; border: none;
          color: var(--amber-600, var(--amber-500)); font-weight: 600; font-size: var(--t-sm);
          cursor: pointer; padding: 8px 2px 0; }
        .bdg-toggle:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

// One medallion. Earned = full colour + gold ring; locked = greyed with a tiny
// progress label so the user sees how close they are.
function Medal({ b, showLock }) {
  return (
    <div className={`bdg-medal ${b.earned ? 'earned' : 'locked'}`} title={`${b.title} — ${b.desc}`}>
      <div className="bm-disc">{b.emoji}</div>
      <div className="bm-name">{b.title}</div>
      {!b.earned && showLock && <div className="bm-prog">{b.progressLabel}</div>}
      <style>{`
        .bdg-medal { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; }
        .bm-disc { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
          font-size: 1.35rem; background: var(--surface-soft); border: 1px solid var(--border);
          transition: transform var(--dur) var(--ease-spring); }
        .bdg-medal.earned .bm-disc { background: radial-gradient(circle at 50% 35%, var(--honey-300), var(--amber-400));
          border-color: var(--amber-500); box-shadow: 0 0 0 3px rgba(240,174,56,0.18); }
        .bdg-medal.earned:hover .bm-disc { transform: translateY(-2px) scale(1.05); }
        .bdg-medal.locked .bm-disc { filter: grayscale(1); opacity: 0.45; }
        .bm-name { font-size: 0.66rem; font-weight: 600; line-height: 1.15; color: var(--text-soft); }
        .bdg-medal.locked .bm-name { color: var(--text-faint); }
        .bm-prog { font-size: 0.6rem; color: var(--text-faint); font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
}
