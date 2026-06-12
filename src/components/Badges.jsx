import { resolveBadges, topBadges, BADGE_CATEGORIES } from '../lib/badges.js';

// The full Achievements page: a showcase strip (the 3 badges friends see),
// a "next up" carrot, and the complete catalogue grouped by category. Earning
// badges is celebrated app-wide (see App.jsx) so it fires from any tab; this
// component is purely the trophy room.
export default function Badges({ state, user }) {
  const { badges, earnedCount, total, next, stats } = resolveBadges(state);
  const showcase = topBadges(state, 3);
  const allDone = earnedCount === total;
  const isCloud = !!user?.cloud;

  return (
    <div className="ach">
      {/* —— Showcase: your best three, and who can see them —————————— */}
      <div className="card ach-showcase">
        <div className="ach-head">
          <div>
            <div className="ach-count"><b>{earnedCount}</b> / {total} unlocked</div>
            <div className="faint ach-sub">
              {isCloud
                ? 'Your best three show on your friends’ check-ins'
                : 'Your three best badges — sign in to show friends'}
            </div>
          </div>
          <div className="ach-streak" title="Best streak">
            <span className="ach-streak-num">{stats.bestStreak}</span>
            <span className="faint">best streak</span>
          </div>
        </div>

        <div className="ach-show-row">
          {showcase.length > 0 ? showcase.map((b, i) => (
            <div key={b.id} className="ach-show">
              <div className="ach-show-disc">{b.emoji}</div>
              <div className="ach-show-name">{b.title}</div>
              {i === 0 && <div className="ach-show-tag">top badge</div>}
            </div>
          )) : (
            <p className="faint ach-empty">No badges yet — log a few days and your first one appears here.</p>
          )}
          {/* pad to three slots so the row reads as "pick your best 3" */}
          {showcase.length > 0 && Array.from({ length: Math.max(0, 3 - showcase.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="ach-show empty"><div className="ach-show-disc">＋</div></div>
          ))}
        </div>
      </div>

      {/* —— Next-up carrot —————————————————————————————————————————— */}
      {allDone ? (
        <div className="card ach-alldone">Every badge unlocked — what a run 🎉</div>
      ) : next && (
        <div className="card ach-next">
          <span className="ach-next-emoji">{next.emoji}</span>
          <div className="ach-next-text">
            <b>Next: {next.title}</b>
            <span className="faint">{next.desc}</span>
          </div>
          <div className="ach-next-right">
            <span className="ach-next-prog">{next.progressLabel}</span>
            <div className="ach-bar"><div className="ach-bar-fill" style={{ width: `${Math.round(next.progress * 100)}%` }} /></div>
          </div>
        </div>
      )}

      {/* —— The full catalogue ——————————————————————————————————————— */}
      {BADGE_CATEGORIES.map((cat) => {
        const group = badges.filter((b) => b.cat === cat);
        const got = group.filter((b) => b.earned).length;
        return (
          <div key={cat} className="card ach-section">
            <div className="ach-cat-head">
              <span className="ach-cat">{cat}</span>
              <span className="ach-cat-count">{got}/{group.length}</span>
            </div>
            <div className="ach-grid">
              {group.map((b) => <Medal key={b.id} b={b} />)}
            </div>
          </div>
        );
      })}

      <style>{`
        .ach { display: flex; flex-direction: column; gap: var(--s-4); }
        .ach-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s-4); margin-bottom: var(--s-4); }
        .ach-count { font-size: var(--t-md); }
        .ach-count b { font-family: var(--font-display); font-size: 1.4rem; color: var(--amber-600); }
        .ach-sub { font-size: var(--t-xs); margin-top: 2px; }
        .ach-streak { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .ach-streak-num { font-family: var(--font-display); font-weight: 600; font-size: 1.4rem; color: var(--amber-500); }
        .ach-streak .faint { font-size: var(--t-xs); }

        .ach-show-row { display: flex; gap: 10px; }
        .ach-show { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 5px;
          background: var(--surface-soft); border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px 6px; position: relative; }
        .ach-show.empty { opacity: 0.5; }
        .ach-show-disc { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; font-size: 1.5rem;
          background: radial-gradient(circle at 50% 35%, var(--honey-300), var(--amber-400)); border: 1px solid var(--amber-500);
          box-shadow: 0 0 0 3px rgba(240,174,56,0.18); }
        .ach-show.empty .ach-show-disc { background: var(--surface); border-style: dashed; box-shadow: none; color: var(--text-faint); }
        .ach-show-name { font-size: 0.72rem; font-weight: 600; line-height: 1.15; color: var(--text-soft); }
        .ach-show-tag { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
          color: var(--amber-600); }
        .ach-empty { padding: 8px 4px; font-size: var(--t-sm); text-align: center; flex: 1; }

        .ach-next { display: flex; align-items: center; gap: 12px; }
        .ach-next-emoji { font-size: 1.6rem; filter: grayscale(1) opacity(0.55); flex-shrink: 0; }
        .ach-next-text { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
        .ach-next-text b { font-size: var(--t-sm); }
        .ach-next-text .faint { font-size: var(--t-xs); }
        .ach-next-right { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; min-width: 110px; }
        .ach-next-prog { font-size: var(--t-xs); color: var(--text-soft); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .ach-bar { width: 100%; height: 7px; border-radius: 99px; background: var(--surface-soft); overflow: hidden; border: 1px solid var(--border); }
        .ach-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--honey-400), var(--amber-500)); transition: width var(--dur) var(--ease-spring); }
        .ach-alldone { font-size: var(--t-sm); font-weight: 600; color: var(--good); }

        .ach-cat-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: var(--s-4); }
        .ach-cat { font-size: var(--t-xs); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-faint); }
        .ach-cat-count { font-size: var(--t-xs); color: var(--text-soft); font-variant-numeric: tabular-nums; }
        .ach-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 12px; }
      `}</style>
    </div>
  );
}

// One medallion. Earned = full colour + gold ring; locked = greyed with a tiny
// progress label so the user sees how close they are.
function Medal({ b }) {
  return (
    <div className={`bdg-medal ${b.earned ? 'earned' : 'locked'}`} title={`${b.title} — ${b.desc}`}>
      <div className="bm-disc">{b.emoji}</div>
      <div className="bm-name">{b.title}</div>
      <div className="bm-prog">{b.earned ? 'Unlocked' : b.progressLabel}</div>
      <style>{`
        .bdg-medal { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; }
        .bm-disc { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center;
          font-size: 1.45rem; background: var(--surface-soft); border: 1px solid var(--border);
          transition: transform var(--dur) var(--ease-spring); }
        .bdg-medal.earned .bm-disc { background: radial-gradient(circle at 50% 35%, var(--honey-300), var(--amber-400));
          border-color: var(--amber-500); box-shadow: 0 0 0 3px rgba(240,174,56,0.18); }
        .bdg-medal.earned:hover .bm-disc { transform: translateY(-2px) scale(1.05); }
        .bdg-medal.locked .bm-disc { filter: grayscale(1); opacity: 0.45; }
        .bm-name { font-size: 0.68rem; font-weight: 600; line-height: 1.15; color: var(--text-soft); }
        .bdg-medal.locked .bm-name { color: var(--text-faint); }
        .bm-prog { font-size: 0.6rem; color: var(--text-faint); font-variant-numeric: tabular-nums; }
        .bdg-medal.earned .bm-prog { color: var(--good); font-weight: 600; }
      `}</style>
    </div>
  );
}
