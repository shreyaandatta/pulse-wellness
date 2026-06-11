import { useState } from 'react';
import { IconSparkle } from './Icons.jsx';
import { PLUS_PERKS, PLUS_PRICE } from '../lib/plan.js';

// The Pulse Plus paywall. With real billing configured it opens Razorpay
// Checkout; otherwise it's an honest demo that activates Plus directly and says
// so. `onUpgrade(cycle)` returns a promise either way.
export default function PlusModal({ open, onClose, onUpgrade, live }) {
  const [cycle, setCycle] = useState('yearly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!open) return null;

  const go = async () => {
    setError(''); setBusy(true);
    try {
      await onUpgrade(cycle);
    } catch (e) {
      if (e?.message !== 'cancelled') setError(e?.message || 'Could not complete checkout.');
      setBusy(false);
    }
  };

  return (
    <div className="plus-modal" onClick={busy ? undefined : onClose}>
      <div className="plus-sheet pop" onClick={(e) => e.stopPropagation()}>
        <div className="ps-mark"><IconSparkle size={26} /></div>
        <h3 className="ps-title">Pulse <span className="ps-grad">Plus</span></h3>
        <p className="ps-sub faint">Everything in Pulse, with room to grow.</p>

        <div className="ps-perks">
          {PLUS_PERKS.map((perk) => (
            <div className="ps-perk" key={perk.title}>
              <span className="ps-emoji">{perk.emoji}</span>
              <div>
                <div className="ps-perk-t">{perk.title}</div>
                <div className="faint ps-perk-d">{perk.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="ps-cycle">
          <button className={`ps-price ${cycle === 'monthly' ? 'on' : ''}`} onClick={() => setCycle('monthly')}>
            <span className="ps-amt">{PLUS_PRICE.monthly}</span><span className="faint">/ month</span>
          </button>
          <button className={`ps-price ${cycle === 'yearly' ? 'on' : ''}`} onClick={() => setCycle('yearly')}>
            <span className="ps-amt">{PLUS_PRICE.yearly}</span><span className="faint">/ year</span>
            <span className="ps-save">save {PLUS_PRICE.yearlySave}</span>
          </button>
        </div>

        {error && <div className="ps-error">{error}</div>}

        <button className="btn btn-primary btn-block" onClick={go} disabled={busy}>
          <IconSparkle size={17} /> {busy ? (live ? 'Opening checkout…' : 'Activating…') : 'Start Plus'}
        </button>
        <button className="btn-ghost btn-block ps-later" onClick={onClose} disabled={busy}>Maybe later</button>

        <p className="ps-demo faint">
          {live
            ? <>Secure payment via <b>Razorpay</b> · auto-renews {cycle} · cancel anytime in Settings.</>
            : <>Demo checkout — this build activates Plus instantly, nothing is charged.</>}
        </p>
      </div>

      <style>{`
        .plus-modal { position: fixed; inset: 0; z-index: 95; display: grid; place-items: center; padding: 20px;
          background: color-mix(in srgb, var(--ink-900) 48%, transparent); backdrop-filter: blur(5px);
          animation: fadeDown .2s var(--ease-out); }
        .plus-sheet { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-xl);
          padding: var(--s-6); max-width: 420px; width: 100%; max-height: 90dvh; overflow-y: auto;
          box-shadow: var(--shadow-lg); text-align: center; }
        .ps-mark { width: 56px; height: 56px; border-radius: 18px; margin: 0 auto 12px; display: grid; place-items: center;
          color: #fff; background: linear-gradient(140deg, var(--amber-400), var(--clay)); box-shadow: var(--shadow-glow);
          animation: pulseGlow 3s var(--ease-out) infinite; }
        .ps-title { font-family: var(--font-display); font-weight: 600; font-size: 1.6rem; }
        .ps-grad { background: linear-gradient(135deg, var(--amber-500), var(--clay));
          -webkit-background-clip: text; background-clip: text; color: transparent; }
        .ps-sub { margin: 4px 0 var(--s-5); }

        .ps-perks { display: flex; flex-direction: column; gap: 12px; text-align: left; margin-bottom: var(--s-5); }
        .ps-perk { display: flex; gap: 12px; align-items: flex-start; }
        .ps-emoji { font-size: 1.25rem; line-height: 1.3; }
        .ps-perk-t { font-weight: 700; font-size: var(--t-sm); }
        .ps-perk-d { font-size: var(--t-xs); line-height: 1.45; }

        .ps-cycle { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: var(--s-4); }
        .ps-price { position: relative; display: flex; flex-direction: column; gap: 2px; align-items: center;
          padding: 12px 8px; border-radius: var(--r-md); background: var(--surface-soft);
          border: 2px solid var(--border); transition: all var(--dur-fast) var(--ease-spring); }
        .ps-price.on { border-color: var(--amber-500); background: color-mix(in srgb, var(--amber-400) 14%, var(--surface)); }
        .ps-amt { font-family: var(--font-display); font-weight: 600; font-size: 1.25rem; }
        .ps-price .faint { font-size: var(--t-xs); }
        .ps-save { position: absolute; top: -9px; right: 8px; font-size: 0.58rem; font-weight: 800; letter-spacing: 0.04em;
          text-transform: uppercase; color: #fff; padding: 2px 7px; border-radius: var(--r-pill);
          background: linear-gradient(135deg, var(--good), #3E9C6B); }

        .ps-error { background: color-mix(in srgb, var(--bad) 12%, var(--surface)); color: var(--bad);
          border: 1px solid color-mix(in srgb, var(--bad) 35%, var(--border)); border-radius: var(--r-md);
          padding: 9px 12px; font-size: var(--t-sm); font-weight: 500; margin-bottom: 10px; }
        .ps-later { margin-top: 8px; color: var(--text-soft); }
        .ps-demo { font-size: var(--t-xs); margin-top: var(--s-4); line-height: 1.45; }
      `}</style>
    </div>
  );
}
