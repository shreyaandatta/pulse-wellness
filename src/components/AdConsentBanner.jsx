// A first-party consent gate shown once to free users before any personalised ad
// loads. "Allow" serves personalised ads; "Use non-personalised" keeps Pulse
// ad-supported without tracking; "Go ad-free" routes to Plus. Nothing loads until
// a choice is made. (For heavy EEA/UK traffic, prefer a Google-certified CMP.)
export default function AdConsentBanner({ ads, onManagePlus }) {
  if (!ads.needsConsent) return null;

  return (
    <div className="ad-consent" role="dialog" aria-label="Ad preferences">
      <div className="ac-body">
        <div className="ac-title">📣 A note on ads</div>
        <p className="ac-text">
          Pulse stays free with ads. We can show <b>personalised</b> ads (uses cookies to
          tailor them) or <b>non-personalised</b> ones (no tracking). Your wellness data is
          never shared either way. You can change this any time in Settings.
        </p>
        <div className="ac-actions">
          <button className="ac-btn primary" onClick={() => ads.choose('personalized')}>Allow personalised</button>
          <button className="ac-btn" onClick={() => ads.choose('declined')}>Non-personalised</button>
          {onManagePlus && <button className="ac-link" onClick={onManagePlus}>Go ad-free with Plus →</button>}
        </div>
      </div>

      <style>{`
        .ad-consent { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--nav-h, 64px) + 12px);
          z-index: 60; width: min(560px, calc(100vw - 24px)); animation: rise var(--dur-slow) var(--ease-out) both; }
        .ac-body { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
          box-shadow: var(--shadow-lg, 0 16px 50px rgba(0,0,0,0.18)); padding: var(--s-5); }
        .ac-title { font-family: var(--font-display); font-weight: 600; font-size: 1.05rem; margin-bottom: 6px; }
        .ac-text { font-size: var(--t-sm); color: var(--text-soft); line-height: 1.5; margin-bottom: 14px; }
        .ac-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .ac-btn { padding: 9px 14px; border-radius: var(--r-md); font-weight: 700; font-size: var(--t-sm);
          border: 1px solid var(--border); background: var(--surface); color: var(--text); transition: all var(--dur-fast); }
        .ac-btn:hover { border-color: var(--amber-400); }
        .ac-btn.primary { background: linear-gradient(135deg, var(--amber-500), var(--amber-600)); color: #fff; border-color: transparent; }
        .ac-btn.primary:hover { box-shadow: 0 8px 24px rgba(232,148,20,0.34); }
        .ac-link { margin-left: auto; font-size: var(--t-xs); font-weight: 600; color: var(--amber-600); padding: 6px; }
        .ac-link:hover { color: var(--amber-700); }
        @media (max-width: 480px) { .ac-link { margin-left: 0; width: 100%; text-align: center; } }
      `}</style>
    </div>
  );
}
