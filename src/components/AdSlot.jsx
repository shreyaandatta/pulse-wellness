import { useEffect, useRef } from 'react';
import { adsConfigured, ADSENSE_CLIENT, ADSENSE_SLOT } from '../lib/ads.js';

// One responsive AdSense unit. Renders nothing unless ads are configured AND the
// caller says we may show them (free user + a consent choice made). The
// "Sponsored" label keeps it honest; the link doubles as a gentle Plus upsell.
export default function AdSlot({ show, onRemove }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!show || !adsConfigured || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch { /* library not ready yet — a later render will retry */ }
  }, [show]);

  if (!adsConfigured || !show) return null;

  return (
    <div className="ad-slot" aria-label="Advertisement">
      <div className="ad-slot-head">
        <span className="ad-tag">Sponsored</span>
        {onRemove && <button className="ad-remove" onClick={onRemove}>Remove ads with Plus →</button>}
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <style>{`
        .ad-slot { margin: var(--s-6) 0 var(--s-2); }
        .ad-slot-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .ad-tag { font-size: var(--t-xs); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-faint); }
        .ad-remove { font-size: var(--t-xs); font-weight: 600; color: var(--amber-600); padding: 2px 4px; border-radius: var(--r-sm); }
        .ad-remove:hover { color: var(--amber-700); background: var(--surface-soft); }
        .ad-slot ins { min-height: 90px; border-radius: var(--r-md); overflow: hidden; background: var(--surface-soft); }
      `}</style>
    </div>
  );
}
