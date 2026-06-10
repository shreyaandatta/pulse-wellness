import { useMemo } from 'react';
import { nudges } from '../lib/insights.js';

// A gentle, time-aware suggestion for today — pure rules over today's log.
// Renders nothing when there's nothing useful to say.
export default function SmartNudge({ state, units }) {
  const items = useMemo(() => nudges(state, state.goals, units), [state, units]);
  if (!items.length) return null;

  return (
    <div className="nudges">
      {items.map((n, i) => (
        <div className={`nudge ${n.tone}`} key={i} style={{ animationDelay: `${i * 70}ms` }}>
          <span className="nudge-emoji">{n.emoji}</span>
          <span>{n.text}</span>
        </div>
      ))}
      <style>{`
        .nudges { display: flex; flex-direction: column; gap: 8px; margin-top: var(--s-4); }
        .nudge { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: var(--r-md);
          font-size: var(--t-sm); font-weight: 500; line-height: 1.4;
          background: color-mix(in srgb, var(--amber-100) 55%, var(--surface));
          border: 1px solid color-mix(in srgb, var(--amber-300) 60%, var(--border));
          animation: rise var(--dur-slow) var(--ease-out) both; }
        .nudge.win { background: color-mix(in srgb, var(--good) 14%, var(--surface));
          border-color: color-mix(in srgb, var(--good) 40%, var(--border)); }
        .nudge-emoji { font-size: 1.1rem; flex-shrink: 0; }
      `}</style>
    </div>
  );
}
