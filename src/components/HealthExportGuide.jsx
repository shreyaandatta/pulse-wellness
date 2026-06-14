import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronL, IconChevronR, IconUpload, IconCheck } from './Icons.jsx';

// A glassmorphism walkthrough that plays before the file picker. An animated
// phone auto-demos how to export — toggle between Apple Health (iPhone) and
// Google Takeout (Android). A "don't show again" checkbox skips it next time.
const GUIDES = {
  apple: {
    label: '🍎 iPhone',
    kicker: '🍎 Apple Health',
    headline: 'Export your data in 4 taps',
    steps: [
      { title: 'Open Health, tap your photo', caption: 'In the Apple Health app, tap your profile picture in the top-right corner.' },
      { title: 'Export All Health Data', caption: 'Scroll to the very bottom of your profile and tap “Export All Health Data”.' },
      { title: 'Confirm the export', caption: 'Tap “Export” and give it a moment — Health zips up your data.' },
      { title: 'Save to Files', caption: 'Choose “Save to Files”. That’s your export.zip — keep it handy.' },
    ],
  },
  android: {
    label: '🤖 Android',
    kicker: '🤖 Google Takeout',
    headline: 'Export your data in 4 steps',
    steps: [
      { title: 'Open takeout.google.com', caption: 'In your browser, go to takeout.google.com and sign in to your Google account.' },
      { title: 'Pick only “Fit”', caption: 'Tap “Deselect all”, then scroll down and tick just “Fit”.' },
      { title: 'Create the export', caption: 'Scroll to the bottom and tap “Next step”, then “Create export”.' },
      { title: 'Download your zip', caption: 'Google prepares a zip — download it once it’s ready, then bring it here.' },
    ],
  },
};

const AUTOPLAY_MS = 3400;

export default function HealthExportGuide({ onClose, onProceed }) {
  const [platform, setPlatform] = useState('apple');
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const [dontShow, setDontShow] = useState(false);
  const timer = useRef(null);

  const guide = GUIDES[platform];
  const count = guide.steps.length;

  // Auto-advance through the steps, looping, until the user takes control.
  useEffect(() => {
    if (!auto) return undefined;
    timer.current = setTimeout(() => setStep((s) => (s + 1) % count), AUTOPLAY_MS);
    return () => clearTimeout(timer.current);
  }, [step, auto, count]);

  // Esc to close + lock body scroll while open.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const take = (next) => { setAuto(false); setStep(next); };
  const go = (dir) => take((step + dir + count) % count);
  const switchTo = (p) => { if (p === platform) return; setPlatform(p); setStep(0); setAuto(true); };

  // Portal to <body> so no transformed ancestor (the animated card grid) hijacks
  // our position:fixed and pushes the modal off-screen.
  return createPortal((
    <div className="hg-overlay" onClick={onClose}>
      <div className="hg-glass pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="hg-x" onClick={onClose} aria-label="Close">✕</button>

        <div className="hg-head">
          <div className="hg-seg" role="tablist">
            {Object.keys(GUIDES).map((p) => (
              <button key={p} role="tab" aria-selected={platform === p}
                className={`hg-seg-btn ${platform === p ? 'on' : ''}`} onClick={() => switchTo(p)}>
                {GUIDES[p].label}
              </button>
            ))}
          </div>
          <h3>{guide.headline}</h3>
        </div>

        <div className="hg-stage">
          <div className={`hg-phone ${platform}`}>
            {platform === 'apple' ? <span className="hg-island" /> : <span className="hg-camera" />}
            <div className="hg-screen">
              {guide.steps.map((_, i) => (
                <div className={`hg-scr ${i === step ? 'on' : i < step ? 'past' : 'next'}`} key={i} aria-hidden={i !== step}>
                  {renderScreen(platform, i)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hg-copy" key={`${platform}-${step}`}>
          <div className="hg-step-n">Step {step + 1} of {count}</div>
          <div className="hg-title">{guide.steps[step].title}</div>
          <p className="hg-cap">{guide.steps[step].caption}</p>
        </div>

        <div className="hg-nav">
          <button className="hg-arrow" onClick={() => go(-1)} aria-label="Previous"><IconChevronL size={18} /></button>
          <div className="hg-dots">
            {guide.steps.map((_, i) => (
              <button key={i} className={`hg-dot ${i === step ? 'on' : ''}`} onClick={() => take(i)} aria-label={`Step ${i + 1}`}>
                {auto && i === step && <span className="hg-dot-fill" />}
              </button>
            ))}
          </div>
          <button className="hg-arrow" onClick={() => go(1)} aria-label="Next"><IconChevronR size={18} /></button>
        </div>

        <label className="hg-check">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
          <span className="hg-box">{dontShow && <IconCheck size={13} />}</span>
          Don’t show this again
        </label>

        <button className="btn btn-primary hg-go" onClick={() => onProceed(dontShow)}>
          <IconUpload size={17} /> Choose my export file
        </button>

        <style>{styles}</style>
      </div>
    </div>
  ), document.body);
}

// --- screen dispatch ---------------------------------------------------------
function renderScreen(platform, i) {
  return platform === 'apple' ? renderApple(i) : renderAndroid(i);
}

// --- Apple Health screens ----------------------------------------------------
function renderApple(i) {
  if (i === 0) {
    return (
      <div className="ph ph-summary">
        <div className="ph-statusbar"><span>9:41</span><span className="ph-sig" /></div>
        <div className="ph-nav"><span className="ph-h1">Summary</span><span className="ph-avatar tap-target"><TapDot /></span></div>
        <div className="ph-pill" />
        <div className="ph-card"><span className="ph-heart">❤️</span><div className="ph-lines"><i style={{ width: '50%' }} /><i style={{ width: '74%' }} /></div></div>
        <div className="ph-card"><span className="ph-heart">👟</span><div className="ph-lines"><i style={{ width: '42%' }} /><i style={{ width: '66%' }} /></div></div>
        <div className="ph-card"><span className="ph-heart">😴</span><div className="ph-lines"><i style={{ width: '38%' }} /><i style={{ width: '60%' }} /></div></div>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className="ph ph-profile">
        <div className="ph-statusbar"><span>9:41</span><span className="ph-sig" /></div>
        <div className="ph-nav ph-nav-sm"><span className="ph-back">‹ Summary</span></div>
        <div className="ph-profrow"><span className="ph-avatar lg" /><div className="ph-lines"><i style={{ width: '54%' }} /><i style={{ width: '30%' }} /></div></div>
        <div className="ph-row"><i style={{ width: '40%' }} /></div>
        <div className="ph-row"><i style={{ width: '52%' }} /></div>
        <div className="ph-row"><i style={{ width: '34%' }} /></div>
        <div className="ph-row ph-export tap-target"><span>Export All Health Data</span><TapDot /></div>
      </div>
    );
  }
  if (i === 2) {
    return (
      <div className="ph ph-confirm">
        <div className="ph-statusbar"><span>9:41</span><span className="ph-sig" /></div>
        <div className="ph-dim" />
        <div className="ph-sheet">
          <p className="ph-sheet-t">Exporting your health data may take a few minutes.</p>
          <button className="ph-sheet-btn tap-target">Export<TapDot /></button>
          <button className="ph-sheet-btn ghost">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div className="ph ph-share">
      <div className="ph-statusbar"><span>9:41</span><span className="ph-sig" /></div>
      <div className="ph-dim" />
      <div className="ph-sharesheet">
        <div className="ph-share-apps"><span /><span /><span /><span /></div>
        <div className="ph-share-row tap-target"><span className="ph-files">📁</span> Save to Files<TapDot /></div>
        <div className="ph-share-row"><span className="ph-files">✉️</span> Mail</div>
        <div className="ph-share-row"><span className="ph-files">💬</span> Messages</div>
      </div>
    </div>
  );
}

// --- Google Takeout (Android) screens ---------------------------------------
function renderAndroid(i) {
  if (i === 0) {
    return (
      <div className="ph gph">
        <div className="ph-statusbar g-status"><span>9:41</span><span className="ph-sig" /></div>
        <div className="g-omnibox tap-target"><span className="g-lock">🔒</span> takeout.google.com<TapDot /></div>
        <div className="g-wordmark"><b style={{ color: '#4285F4' }}>G</b><b style={{ color: '#EA4335' }}>o</b><b style={{ color: '#FBBC05' }}>o</b><b style={{ color: '#4285F4' }}>g</b><b style={{ color: '#34A853' }}>l</b><b style={{ color: '#EA4335' }}>e</b> <span className="g-takeout">Takeout</span></div>
        <div className="g-hero">Download your data</div>
        <div className="g-row"><i style={{ width: '70%' }} /></div>
        <div className="g-row"><i style={{ width: '52%' }} /></div>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className="ph gph">
        <div className="ph-statusbar g-status"><span>9:41</span><span className="ph-sig" /></div>
        <div className="g-bar"><span>Select data</span><span className="g-link">Deselect all</span></div>
        <div className="g-prod"><span className="g-check" /> <i style={{ width: '36%' }} /></div>
        <div className="g-prod"><span className="g-check" /> <i style={{ width: '50%' }} /></div>
        <div className="g-prod tap-target on"><span className="g-check ck">✓</span> <b>Fit</b><TapDot /></div>
        <div className="g-prod"><span className="g-check" /> <i style={{ width: '40%' }} /></div>
      </div>
    );
  }
  if (i === 2) {
    return (
      <div className="ph gph">
        <div className="ph-statusbar g-status"><span>9:41</span><span className="ph-sig" /></div>
        <div className="g-bar"><span>Export options</span></div>
        <div className="g-opt"><i style={{ width: '60%' }} /><span className="g-pick" /></div>
        <div className="g-opt"><i style={{ width: '44%' }} /><span className="g-pick" /></div>
        <div className="g-opt"><i style={{ width: '52%' }} /><span className="g-pick" /></div>
        <button className="g-cta tap-target">Create export<TapDot /></button>
      </div>
    );
  }
  return (
    <div className="ph gph g-done">
      <div className="ph-statusbar g-status"><span>9:41</span><span className="ph-sig" /></div>
      <div className="g-done-ico">📦</div>
      <div className="g-done-t">Your export is ready</div>
      <div className="g-done-s">1 file · Google Fit</div>
      <button className="g-cta g-dl tap-target">⬇ Download<TapDot /></button>
    </div>
  );
}

// A pulsing ring + finger. Rendered INSIDE a .tap-target element so it always
// centres on the exact thing to tap — no hand-tuned coordinates to drift.
function TapDot() {
  return (
    <span className="hg-tap">
      <span className="hg-ring" /><span className="hg-ring d" /><span className="hg-finger">👆</span>
    </span>
  );
}

const styles = `
  .hg-overlay { position: fixed; inset: 0; z-index: 110; display: grid; place-items: center; padding: 18px;
    background: radial-gradient(120% 90% at 50% 0%, rgba(40,26,12,.38), rgba(20,13,8,.62));
    backdrop-filter: blur(9px) saturate(1.15); -webkit-backdrop-filter: blur(9px) saturate(1.15);
    animation: hgFade .26s var(--ease-out); }
  @keyframes hgFade { from { opacity: 0; } to { opacity: 1; } }

  .hg-glass { position: relative; width: 100%; max-width: 380px; max-height: 92dvh; overflow-y: auto;
    padding: 22px 22px 20px; border-radius: 26px; text-align: center;
    background: linear-gradient(165deg, color-mix(in srgb, var(--surface) 82%, transparent),
      color-mix(in srgb, var(--surface) 60%, transparent));
    backdrop-filter: blur(26px) saturate(1.5); -webkit-backdrop-filter: blur(26px) saturate(1.5);
    border: 1px solid rgba(255,255,255,.5);
    box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,.6), inset 0 0 40px rgba(255,255,255,.06);
    animation: hgRise .42s var(--ease-spring) both; }
  [data-theme="dark"] .hg-glass { border-color: rgba(255,255,255,.12);
    box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,.10); }
  @keyframes hgRise { from { opacity: 0; transform: translateY(16px) scale(.96); } to { opacity: 1; transform: none; } }

  .hg-x { position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border-radius: 50%;
    border: 1px solid var(--border); background: color-mix(in srgb, var(--surface) 60%, transparent);
    color: var(--text-soft); font-size: 13px; cursor: pointer; display: grid; place-items: center; z-index: 2;
    transition: transform var(--dur-fast), background var(--dur-fast); }
  .hg-x:hover { transform: rotate(90deg); background: var(--surface-soft); }

  .hg-head { margin-bottom: 12px; }
  .hg-seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: var(--r-pill); margin-bottom: 12px;
    background: color-mix(in srgb, var(--surface-soft) 75%, transparent); border: 1px solid var(--border); }
  .hg-seg-btn { border: none; background: none; padding: 6px 15px; border-radius: var(--r-pill);
    font-size: var(--t-sm); font-weight: 600; color: var(--text-soft); cursor: pointer;
    transition: color var(--dur-fast), background var(--dur), box-shadow var(--dur); }
  .hg-seg-btn.on { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm); }
  .hg-head h3 { font-family: var(--font-display); font-weight: 600; font-size: 1.3rem; }

  /* stage + phone */
  .hg-stage { display: grid; place-items: center; padding: 6px 0 4px; }
  .hg-phone { position: relative; width: 192px; height: 392px; border-radius: 38px; padding: 9px;
    background: linear-gradient(160deg, #3a3a3e, #161618 60%, #2a2a2e);
    box-shadow: 0 18px 40px rgba(0,0,0,.4), inset 0 0 0 2px rgba(255,255,255,.06), inset 0 1px 1px rgba(255,255,255,.25); }
  .hg-island { position: absolute; top: 17px; left: 50%; transform: translateX(-50%); z-index: 6;
    width: 64px; height: 18px; border-radius: 12px; background: #000; }
  .hg-camera { position: absolute; top: 17px; left: 50%; transform: translateX(-50%); z-index: 6;
    width: 9px; height: 9px; border-radius: 50%; background: #000; box-shadow: inset 0 0 0 1px rgba(80,120,200,.5); }
  .hg-screen { position: relative; width: 100%; height: 100%; border-radius: 30px; overflow: hidden;
    background: var(--surface); }

  .hg-scr { position: absolute; inset: 0; opacity: 0; transform: translateX(34px) scale(.99);
    transition: opacity .5s var(--ease-out), transform .5s var(--ease-out); pointer-events: none; }
  .hg-scr.on { opacity: 1; transform: none; }
  .hg-scr.past { transform: translateX(-34px) scale(.99); }

  /* generic faux-screen bits (shared) */
  .ph { position: absolute; inset: 0; padding: 30px 12px 12px; background: #f4f4f7; color: #1c1c1e;
    font-size: 10px; text-align: left; }
  .ph-statusbar { position: absolute; top: 9px; left: 16px; right: 16px; display: flex; justify-content: space-between;
    font-size: 9px; font-weight: 700; color: #1c1c1e; z-index: 3; }
  .ph-sig { width: 16px; height: 9px; border-radius: 2px; background: #1c1c1e; opacity: .8; }

  /* Apple bits */
  .ph-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .ph-h1 { font-size: 17px; font-weight: 800; letter-spacing: -.02em; }
  .ph-nav-sm { justify-content: flex-start; }
  .ph-back { color: #007aff; font-size: 12px; font-weight: 600; }
  .ph-avatar { width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(140deg, #9bd0ff, #5a86d6); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.6); }
  .ph-avatar.lg { width: 44px; height: 44px; }
  .ph-pill { height: 7px; width: 64px; border-radius: 4px; background: #d6d6dc; margin: 0 0 12px; }
  .ph-card { display: flex; align-items: center; gap: 9px; background: #fff; border-radius: 12px;
    padding: 11px 12px; margin-bottom: 9px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
  .ph-heart { font-size: 15px; }
  .ph-lines { flex: 1; display: grid; gap: 6px; }
  .ph-lines i { height: 6px; border-radius: 3px; background: #e3e3e8; display: block; }
  .ph-profrow { display: flex; align-items: center; gap: 11px; background: #fff; border-radius: 12px;
    padding: 12px; margin-bottom: 12px; }
  .ph-row { background: #fff; border-radius: 10px; padding: 12px; margin-bottom: 8px; }
  .ph-row i { height: 7px; border-radius: 4px; background: #e3e3e8; display: block; }
  .ph-export { color: #007aff; font-weight: 700; font-size: 12px; }
  .ph-export span { color: #007aff; }
  .ph-dim { position: absolute; inset: 0; background: rgba(0,0,0,.28); }
  .ph-sheet { position: absolute; left: 10px; right: 10px; bottom: 10px; background: #fbfbfd; border-radius: 16px;
    padding: 12px; box-shadow: 0 -4px 20px rgba(0,0,0,.12); }
  .ph-sheet-t { font-size: 10px; color: #6b6b70; text-align: center; margin-bottom: 10px; line-height: 1.4; }
  .ph-sheet-btn { display: block; width: 100%; padding: 10px; border-radius: 11px; border: none;
    background: #fff; color: #007aff; font-size: 13px; font-weight: 700; margin-bottom: 7px; }
  .ph-sheet-btn.ghost { color: #007aff; font-weight: 500; }
  .ph-sharesheet { position: absolute; left: 10px; right: 10px; bottom: 10px; background: #fbfbfd; border-radius: 16px;
    padding: 12px; box-shadow: 0 -4px 20px rgba(0,0,0,.12); }
  .ph-share-apps { display: flex; gap: 10px; margin-bottom: 12px; }
  .ph-share-apps span { width: 36px; height: 36px; border-radius: 9px; background: linear-gradient(140deg,#e6e6ec,#d2d2da); }
  .ph-share-row { display: flex; align-items: center; gap: 9px; padding: 9px 4px; font-size: 12px; font-weight: 600;
    border-top: 1px solid #ececf0; }
  .ph-files { font-size: 15px; }

  /* Google Takeout bits */
  .gph { background: #fff; padding-top: 26px; }
  .g-status { color: #1c1c1e; }
  .g-omnibox { display: flex; align-items: center; gap: 6px; margin: 4px 6px 14px; padding: 8px 12px;
    background: #f1f3f4; border-radius: 999px; font-size: 11px; color: #3c4043; font-weight: 500; }
  .g-lock { font-size: 9px; }
  .g-wordmark { font-size: 16px; font-weight: 700; letter-spacing: -.02em; text-align: center; margin-bottom: 4px; }
  .g-takeout { color: #5f6368; font-weight: 500; }
  .g-hero { text-align: center; font-size: 12px; color: #5f6368; margin-bottom: 14px; }
  .g-row { background: #f1f3f4; border-radius: 8px; padding: 11px; margin: 0 4px 8px; }
  .g-row i { height: 7px; border-radius: 4px; background: #dadce0; display: block; }
  .g-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 4px 12px;
    font-size: 13px; font-weight: 700; color: #202124; }
  .g-link { color: #1a73e8; font-size: 11px; font-weight: 600; }
  .g-prod { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #e8eaed;
    border-radius: 10px; padding: 11px; margin: 0 4px 8px; font-size: 12px; color: #202124; }
  .g-prod.on { border-color: #1a73e8; background: #e8f0fe; }
  .g-check { width: 16px; height: 16px; border-radius: 4px; border: 2px solid #bdc1c6; flex: none; }
  .g-check.ck { border: none; background: #1a73e8; color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 800; }
  .g-prod i { height: 7px; border-radius: 4px; background: #dadce0; display: block; }
  .g-opt { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #fff;
    border: 1px solid #e8eaed; border-radius: 10px; padding: 12px 11px; margin: 0 4px 8px; }
  .g-opt i { height: 7px; border-radius: 4px; background: #dadce0; display: block; }
  .g-pick { width: 22px; height: 12px; border-radius: 999px; background: #1a73e8; flex: none; position: relative; }
  .g-pick::after { content: ''; position: absolute; top: 1px; right: 1px; width: 10px; height: 10px; border-radius: 50%; background: #fff; }
  .g-cta { display: block; width: calc(100% - 8px); margin: 14px 4px 0; padding: 11px; border: none; border-radius: 999px;
    background: #1a73e8; color: #fff; font-size: 13px; font-weight: 700; }
  .g-done { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 30px; }
  .g-done-ico { font-size: 40px; margin-bottom: 8px; }
  .g-done-t { font-size: 14px; font-weight: 800; color: #202124; }
  .g-done-s { font-size: 11px; color: #5f6368; margin-top: 3px; margin-bottom: 4px; }
  .g-dl { width: 150px; margin-top: 14px; }

  /* the tap-target glow + finger */
  .tap-target { position: relative; animation: hgGlow 1.6s var(--ease-out) infinite; border-radius: 12px; }
  @keyframes hgGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(26,115,232,.0); } 45% { box-shadow: 0 0 0 4px rgba(26,115,232,.26); } }
  .hg-tap { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 5; pointer-events: none; }
  .hg-ring { position: absolute; left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px;
    border-radius: 50%; border: 2px solid rgba(26,115,232,.9); animation: hgRipple 1.6s var(--ease-out) infinite; }
  .hg-ring.d { animation-delay: .8s; }
  @keyframes hgRipple { 0% { transform: scale(.5); opacity: .9; } 80%,100% { transform: scale(2.6); opacity: 0; } }
  .hg-finger { position: absolute; left: 4px; top: 6px; font-size: 22px; filter: drop-shadow(0 2px 3px rgba(0,0,0,.25));
    animation: hgTapMove 1.6s var(--ease-out) infinite; }
  @keyframes hgTapMove { 0%,100% { transform: translate(0,0) rotate(-8deg); } 45% { transform: translate(-3px,-5px) rotate(-8deg) scale(.9); } }

  /* copy */
  .hg-copy { margin-top: 14px; min-height: 84px; animation: hgSwap .45s var(--ease-out); }
  @keyframes hgSwap { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .hg-step-n { font-size: var(--t-xs); font-weight: 700; color: var(--amber-600); letter-spacing: .04em; text-transform: uppercase; }
  .hg-title { font-family: var(--font-display); font-weight: 600; font-size: 1.12rem; margin: 4px 0 6px; }
  .hg-cap { font-size: var(--t-sm); color: var(--text-soft); line-height: 1.5; max-width: 300px; margin: 0 auto; }

  /* nav */
  .hg-nav { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 14px 0 4px; }
  .hg-arrow { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface) 55%, transparent); color: var(--text); cursor: pointer;
    display: grid; place-items: center; transition: transform var(--dur-fast), background var(--dur-fast); }
  .hg-arrow:hover { background: var(--surface-soft); transform: scale(1.08); }
  .hg-dots { display: flex; gap: 7px; align-items: center; }
  .hg-dot { position: relative; width: 8px; height: 8px; border-radius: 50%; border: none; padding: 0; cursor: pointer;
    background: var(--ink-300); overflow: hidden; transition: width .35s var(--ease-spring), background .3s; }
  .hg-dot.on { width: 26px; border-radius: 5px; background: color-mix(in srgb, var(--amber-500) 30%, var(--ink-300)); }
  .hg-dot-fill { position: absolute; inset: 0; border-radius: 5px; background: var(--amber-500);
    transform-origin: left; animation: hgFill ${AUTOPLAY_MS}ms linear; }
  @keyframes hgFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }

  /* checkbox */
  .hg-check { display: inline-flex; align-items: center; gap: 9px; margin: 12px 0 14px; cursor: pointer;
    font-size: var(--t-sm); color: var(--text-soft); user-select: none; }
  .hg-check input { position: absolute; opacity: 0; pointer-events: none; }
  .hg-box { width: 19px; height: 19px; border-radius: 6px; border: 1.5px solid var(--border);
    background: color-mix(in srgb, var(--surface) 60%, transparent); display: grid; place-items: center;
    color: #fff; transition: all var(--dur-fast) var(--ease-spring); }
  .hg-check input:checked + .hg-box { background: var(--amber-500); border-color: var(--amber-500); transform: scale(1.05); }

  .hg-go { width: 100%; justify-content: center; gap: 8px; }
`;
