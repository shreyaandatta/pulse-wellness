import { useState } from 'react';
import { usePWA } from '../hooks/usePWA.js';
import { IconShare, IconAddSquare, IconDownload, IconX, IconBolt } from './Icons.jsx';

// Device-level (not per-account) memory of whether the user dismissed the
// "use it like an app" nudge — so it doesn't nag, but quietly returns weeks
// later if they still haven't installed.
const DISMISS_KEY = 'pulse.a2hs.dismissedAt';
const SNOOZE_MS = 21 * 86400000; // re-surface after ~3 weeks

function dismissedRecently() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    return ts > 0 && Date.now() - ts < SNOOZE_MS;
  } catch { return false; }
}

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
// iPadOS 13+ masquerades as desktop Safari, so also treat touch-capable Macs as iOS.
const isIOS = /iphone|ipad|ipod/i.test(ua) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /android/i.test(ua);
// On iOS every browser is WebKit, but only Safari can Add to Home Screen.
const isIOSSafari = isIOS && !/crios|fxios|edgios|opios/i.test(ua);

// A friendly, dismissible nudge that teaches people Pulse can live on their
// home screen as a real app. Shown on Today when not already installed.
export default function InstallPrompt({ notify }) {
  const pwa = usePWA();
  const [hidden, setHidden] = useState(dismissedRecently);

  // Nothing to offer if it's already installed, was just dismissed, or this is
  // a desktop browser with no install affordance we can drive.
  if (pwa.installed || hidden) return null;
  const relevant = pwa.canInstall || isIOS || isAndroid;
  if (!relevant) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setHidden(true);
  };

  const doInstall = async () => {
    if (await pwa.install()) notify?.('Pulse added to your device', '🎉');
  };

  return (
    <div className="a2hs">
      <button className="a2hs-x" onClick={dismiss} aria-label="Dismiss"><IconX size={16} /></button>

      <div className="a2hs-head">
        <div className="a2hs-mark"><IconBolt size={22} /></div>
        <div>
          <div className="a2hs-title">Use Pulse like an app</div>
          <div className="a2hs-sub">Add it to your home screen — opens full-screen, instantly, and works offline.</div>
        </div>
      </div>

      {pwa.canInstall ? (
        // Android / desktop Chrome can fire the native install dialog.
        <button className="a2hs-cta" onClick={doInstall}>
          <IconDownload size={18} /> Install Pulse
        </button>
      ) : isIOSSafari ? (
        // iOS Safari has no install API — guide the Share-sheet steps.
        <ol className="a2hs-steps">
          <li>Tap <span className="a2hs-chip"><IconShare size={15} /> Share</span> in the toolbar below</li>
          <li>Choose <span className="a2hs-chip"><IconAddSquare size={15} /> Add to Home Screen</span></li>
        </ol>
      ) : isIOS ? (
        // iOS, but a non-Safari browser — A2HS only works from Safari.
        <p className="a2hs-note">Open <b>pulsebysd.vercel.app</b> in <b>Safari</b>, then tap
          {' '}<span className="a2hs-chip"><IconShare size={15} /> Share</span> → <b>Add to Home Screen</b>.</p>
      ) : (
        // Android browser without the prompt (e.g. Firefox).
        <p className="a2hs-note">Open your browser menu and choose <b>Add to Home screen</b> to install Pulse.</p>
      )}

      <style>{`
        .a2hs {
          position: relative;
          background: linear-gradient(150deg, color-mix(in srgb, var(--amber-100) 55%, var(--surface)), var(--surface));
          border: 1px solid color-mix(in srgb, var(--amber-300) 60%, var(--border));
          border-radius: var(--r-lg); padding: 16px 18px; box-shadow: var(--shadow-sm);
          animation: fadeDown .35s var(--ease-out);
        }
        .a2hs-x { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px;
          display: grid; place-items: center; border-radius: var(--r-pill); color: var(--text-faint);
          transition: all var(--dur-fast); }
        .a2hs-x:hover { background: var(--surface-soft); color: var(--text); }
        .a2hs-head { display: flex; gap: 13px; align-items: flex-start; padding-right: 26px; }
        .a2hs-mark { flex-shrink: 0; width: 40px; height: 40px; border-radius: var(--r-md); display: grid; place-items: center;
          color: #FFFBF5; background: linear-gradient(140deg, var(--amber-400), var(--amber-600)); box-shadow: var(--shadow-glow); }
        .a2hs-title { font-family: var(--font-display); font-weight: 600; font-size: var(--t-md); line-height: 1.2; }
        .a2hs-sub { font-size: var(--t-sm); color: var(--text-soft); margin-top: 3px; line-height: 1.45; max-width: 44ch; }

        .a2hs-cta { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px;
          padding: 10px 18px; border-radius: var(--r-pill); font-weight: 600; font-size: var(--t-sm);
          color: #FFFBF5; background: linear-gradient(140deg, var(--amber-500), var(--amber-600));
          box-shadow: var(--shadow-sm); transition: transform var(--dur-fast) var(--ease-spring); }
        .a2hs-cta:active { transform: scale(0.96); }

        .a2hs-steps { list-style: none; counter-reset: step; margin: 14px 0 0; padding: 0;
          display: flex; flex-direction: column; gap: 9px; }
        .a2hs-steps li { counter-increment: step; display: flex; align-items: center; flex-wrap: wrap; gap: 7px;
          font-size: var(--t-sm); color: var(--text); }
        .a2hs-steps li::before { content: counter(step); flex-shrink: 0; width: 21px; height: 21px; border-radius: var(--r-pill);
          display: grid; place-items: center; font-size: 0.72rem; font-weight: 700;
          color: var(--amber-700); background: color-mix(in srgb, var(--amber-300) 45%, var(--surface)); }
        .a2hs-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: var(--r-pill);
          background: var(--surface); border: 1px solid var(--border); font-weight: 600; color: var(--text); box-shadow: var(--shadow-xs); }
        .a2hs-chip svg { color: var(--amber-600); }

        .a2hs-note { margin-top: 12px; font-size: var(--t-sm); color: var(--text-soft); line-height: 1.5; }
        .a2hs-note b { color: var(--text); }
      `}</style>
    </div>
  );
}
