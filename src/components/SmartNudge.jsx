import { useMemo } from 'react';
import { nudges } from '../lib/insights.js';

// A gentle, time-aware suggestion for today — pure rules over today's log.
// Renders nothing when there's nothing useful to say.
export default function SmartNudge({ state, units, onJump }) {
  const items = useMemo(() => nudges(state, state.goals, units), [state, units]);
  if (!items.length) return null;

  return (
    <div className="nudges">
      {items.map((n, i) => {
        const clickable = !!(n.target && onJump);
        const Tag = clickable ? 'button' : 'div';
        return (
          <Tag
            className={`nudge ${n.tone} ${clickable ? 'tap' : ''}`}
            key={i}
            style={{ animationDelay: `${i * 70}ms` }}
            onClick={clickable ? () => onJump(n.target) : undefined}
          >
            <span className="nudge-emoji">{n.emoji}</span>
            <span className="nudge-text">{n.text}</span>
            {clickable && <span className="nudge-go" aria-hidden="true">›</span>}
          </Tag>
        );
      })}
      <style>{`
        .nudges { display: flex; flex-direction: column; gap: 8px; margin-top: var(--s-4); }
        .nudge { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: var(--r-md);
          font-size: var(--t-sm); font-weight: 500; line-height: 1.4; text-align: left; width: 100%;
          background: color-mix(in srgb, var(--amber-100) 55%, var(--surface));
          border: 1px solid color-mix(in srgb, var(--amber-300) 60%, var(--border));
          animation: rise var(--dur-slow) var(--ease-out) both; }
        .nudge.win { background: color-mix(in srgb, var(--good) 14%, var(--surface));
          border-color: color-mix(in srgb, var(--good) 40%, var(--border)); }
        .nudge.tap { cursor: pointer; transition: transform var(--dur-fast) var(--ease-spring), border-color var(--dur-fast), box-shadow var(--dur-fast); }
        .nudge.tap:hover { border-color: var(--amber-400); box-shadow: var(--shadow-xs); }
        .nudge.tap:active { transform: scale(0.985); }
        .nudge-emoji { font-size: 1.1rem; flex-shrink: 0; }
        .nudge-text { flex: 1; }
        .nudge-go { flex-shrink: 0; font-size: 1.2rem; font-weight: 700; color: var(--amber-600); line-height: 1; opacity: 0.7; }
      `}</style>
    </div>
  );
}
