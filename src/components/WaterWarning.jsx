import { waterCurrentLabel, SAFE_WATER_MAX_ML } from '../lib/units.js';

// A gentle popup when today's water crosses the over-hydration guardrail. Framed
// as a caring heads-up, not an alarm — drinking far past your needs (especially
// fast) can dilute the body's sodium. Shown once per day (see App's guard).
export default function WaterWarning({ open, amountMl, units, onClose }) {
  if (!open) return null;
  return (
    <div className="wwarn-modal" onClick={onClose}>
      <div className="wwarn-sheet pop" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-labelledby="wwarn-title">
        <div className="wwarn-mark">💧</div>
        <h3 id="wwarn-title" className="wwarn-title">Easy on the water</h3>
        <p className="wwarn-body">
          You’ve logged <b>{waterCurrentLabel(amountMl, units)}</b> today — past the
          ~{waterCurrentLabel(SAFE_WATER_MAX_ML, units)} most people need. Drinking a lot
          more than your body needs, especially quickly, can thin out your blood’s sodium
          (it’s called hyponatremia). Unless you’re very active or it’s hot, there’s no need
          to push much further.
        </p>
        <button className="btn btn-primary btn-block" onClick={onClose}>Got it</button>
        <p className="wwarn-foot faint">A friendly heads-up, not medical advice.</p>
      </div>

      <style>{`
        .wwarn-modal { position: fixed; inset: 0; z-index: 96; display: grid; place-items: center; padding: 20px;
          background: color-mix(in srgb, var(--ink-900) 64%, transparent); backdrop-filter: blur(6px);
          animation: fadeDown .2s var(--ease-out); }
        .wwarn-sheet { background: var(--cream-0); border: 1px solid var(--border); border-radius: var(--r-xl);
          padding: var(--s-6); max-width: 400px; width: 100%; box-shadow: var(--shadow-lg); text-align: center; }
        .wwarn-mark { width: 56px; height: 56px; border-radius: 18px; margin: 0 auto 14px; display: grid; place-items: center;
          font-size: 28px; background: color-mix(in srgb, var(--water) 18%, var(--surface-soft));
          box-shadow: 0 8px 24px color-mix(in srgb, var(--water) 30%, transparent); }
        .wwarn-title { font-family: var(--font-display); font-weight: 600; font-size: 1.4rem; }
        .wwarn-body { margin: 10px 0 18px; line-height: 1.55; font-size: var(--t-sm); color: var(--text-soft); }
        .wwarn-body b { color: var(--text); }
        .wwarn-foot { font-size: var(--t-xs); margin-top: 12px; }
      `}</style>
    </div>
  );
}
