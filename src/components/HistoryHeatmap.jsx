import { useMemo } from 'react';
import { todayKey, addDays, keyToDate, prettyDate, isToday } from '../lib/dates.js';
import { getDay } from '../lib/storage.js';
import { dayScore } from '../lib/score.js';

// The signature visual: every day you've logged, rendered as a cell of warm
// light. Intensity follows the same wellness gradient as the daily ring, so a
// glance shows not just *that* you logged but *how the day went*.
//
// Laid out GitHub-style — one column per week, Sun→Sat down each column — but
// rounded and amber-lit to match Pulse rather than a code-commit grid.

const MIN_WEEKS = 8;       // always show at least this much canvas
const LEVELS = 5;          // 0 (empty) .. 4 (thriving)
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// score → 0..4 brightness. Any logged day is at least level 1, so an off day
// still shows as a faint ember rather than vanishing into "empty".
function levelFor(hasData, score) {
  if (!hasData) return 0;
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 35) return 2;
  return 1;
}

// `limitDays` (optional) clips the grid to the most recent N days — the free
// plan's window. Older cells render as blank slots; the data itself is untouched.
export default function HistoryHeatmap({ state, limitDays }) {
  const { weeks, monthLabels, firstDay } = useMemo(() => buildGrid(state, limitDays), [state, limitDays]);
  const total = Object.keys(state.days).length;

  return (
    <div className="heatmap">
      <div className="hm-scroll">
        <div className="hm-inner">
          <div className="hm-months">
            {monthLabels.map((m, i) => (
              <span key={i} className="hm-month" style={{ gridColumn: `${m.col + 1} / span ${m.span}` }}>{m.label}</span>
            ))}
          </div>

          <div className="hm-body">
            <div className="hm-wdays">
              <span></span><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span>
            </div>
            <div className="hm-grid">
              {weeks.map((week, wi) => (
                <div className="hm-week" key={wi}>
                  {week.map((cell, di) => (
                    cell ? (
                      <div
                        key={cell.key}
                        className={`hm-cell lvl-${cell.level} ${cell.today ? 'today' : ''}`}
                        style={{ animationDelay: `${wi * 22 + di * 6}ms` }}
                        title={`${prettyDate(cell.key)} · ${cell.hasData ? `score ${cell.score}` : 'no entry'}`}
                      />
                    ) : <div key={di} className="hm-cell empty-slot" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hm-foot">
        <span className="faint">
          {total > 0 ? `Tracking since ${prettyDate(firstDay)}` : 'Your history will glow here as you log days'}
        </span>
        <div className="hm-legend">
          <span className="faint">less</span>
          {Array.from({ length: LEVELS }).map((_, l) => <div key={l} className={`hm-cell lvl-${l}`} />)}
          <span className="faint">more</span>
        </div>
      </div>

      <style>{`
        .heatmap { display: flex; flex-direction: column; gap: 14px; }
        .hm-scroll { overflow-x: auto; padding-bottom: 4px; margin: 0 -4px; }
        .hm-scroll::-webkit-scrollbar { height: 6px; }
        .hm-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
        .hm-inner { display: inline-block; padding: 0 4px; }
        .hm-months { display: grid; grid-auto-flow: column; gap: 3px; margin-left: 22px; margin-bottom: 6px; }
        .hm-month { font-size: var(--t-xs); font-weight: 600; color: var(--text-faint); white-space: nowrap; }
        .hm-body { display: flex; gap: 6px; }
        .hm-wdays { display: flex; flex-direction: column; gap: 3px; }
        .hm-wdays span { height: 15px; width: 16px; font-size: 0.6rem; font-weight: 600; color: var(--text-faint); line-height: 15px; }
        .hm-grid { display: flex; gap: 3px; }
        .hm-week { display: flex; flex-direction: column; gap: 3px; }
        .hm-cell { width: 15px; height: 15px; border-radius: 4px; }
        .hm-grid .hm-cell { animation: cellIn .5s var(--ease-spring) both; }
        .empty-slot { background: transparent; }
        .hm-cell.lvl-0 { background: var(--surface-soft); border: 1px solid var(--border); }
        .hm-cell.lvl-1 { background: #FBE6BE; }
        .hm-cell.lvl-2 { background: var(--amber-300); }
        .hm-cell.lvl-3 { background: var(--amber-500); }
        .hm-cell.lvl-4 { background: linear-gradient(135deg, var(--amber-500), var(--clay)); box-shadow: 0 0 10px rgba(232,148,20,0.45); }
        .hm-cell.today { outline: 2px solid var(--amber-600); outline-offset: 1px; }
        :root[data-theme="dark"] .hm-cell.lvl-1 { background: #5C4520; }
        .hm-foot { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
        .hm-legend { display: flex; align-items: center; gap: 4px; }
        .hm-legend .hm-cell { width: 13px; height: 13px; animation: none; }
        @keyframes cellIn { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .hm-grid .hm-cell { animation: none; } }
      `}</style>
    </div>
  );
}

// Build week-columns from the first logged day (or MIN_WEEKS back) up to today,
// aligned so each column starts on Sunday.
function buildGrid(state, limitDays) {
  const keys = Object.keys(state.days).sort();
  const today = todayKey();
  const baseline = addDays(today, -7 * MIN_WEEKS);
  const firstLogged = keys[0] || baseline;
  let start = firstLogged < baseline ? firstLogged : baseline;
  // free window: never reach further back than the limit
  const windowStart = limitDays ? addDays(today, -(limitDays - 1)) : null;
  if (windowStart && start < windowStart) start = windowStart;

  // back up to the Sunday on/before start
  const startDow = keyToDate(start).getDay();
  start = addDays(start, -startDow);

  const weeks = [];
  const monthLabels = [];
  let cursor = start;
  let lastMonth = -1;
  let col = 0;

  while (cursor <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (cursor > today) { week.push(null); continue; }
      if (windowStart && cursor < windowStart) { week.push(null); cursor = addDays(cursor, 1); continue; }
      const date = keyToDate(cursor);
      const hasData = !!state.days[cursor];
      const score = hasData ? dayScore(getDay(state, cursor), state.goals) : 0;
      week.push({ key: cursor, hasData, score, level: levelFor(hasData, score), today: isToday(cursor) });

      // record a month label the first time a month appears (on the top row)
      if (d === 0) {
        const mo = date.getMonth();
        if (mo !== lastMonth) { monthLabels.push({ label: MONTHS[mo], col, span: 1 }); lastMonth = mo; }
      }
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    col++;
  }

  // give each month label a span up to the next one so it sits centred-ish
  for (let i = 0; i < monthLabels.length; i++) {
    const next = monthLabels[i + 1];
    monthLabels[i].span = (next ? next.col : col) - monthLabels[i].col;
  }

  return { weeks, monthLabels, firstDay: keys[0] || today };
}
