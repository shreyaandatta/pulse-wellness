// Client side of Google AdSense. Stays completely inert — no script, no slots,
// no banner — unless VITE_ADSENSE_CLIENT is set at build time (your approved
// publisher id, "ca-pub-…"). Mirrors how billing/push stay dormant until wired.
//
// Ads are for the FREE plan only; Plus removes them (see useAds + plan.js).
// Because we serve personalised ads, the library loads only after the user makes
// an explicit choice — "allow" serves personalised, "decline" serves
// non-personalised (still ad-supported, no tracking). For heavy EEA/UK traffic
// Google expects a certified CMP; you can switch on AdSense → Privacy & messaging
// and drop this first-party banner later.

export const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || '';
export const ADSENSE_SLOT = import.meta.env.VITE_ADSENSE_SLOT || '';

// The publisher id being present is our single signal that ads are wired up.
export const adsConfigured = Boolean(ADSENSE_CLIENT && ADSENSE_SLOT);

const SCRIPT_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const CONSENT_KEY = 'pulse.ads.consent'; // '' (unset) | 'personalized' | 'declined'

export function getAdConsent() {
  try { return localStorage.getItem(CONSENT_KEY) || ''; } catch { return ''; }
}
export function setAdConsent(v) {
  try { localStorage.setItem(CONSENT_KEY, v); } catch { /* private mode */ }
}

let loaded = false;

// Load the AdSense library once, tagged with the publisher id. When the user
// declined personalisation we flag non-personalised ads *before* any slot fills.
export function loadAdSense(personalized) {
  if (!adsConfigured || loaded || typeof window === 'undefined') return;
  loaded = true;
  window.adsbygoogle = window.adsbygoogle || [];
  if (!personalized) window.adsbygoogle.requestNonPersonalizedAds = 1;
  const s = document.createElement('script');
  s.src = `${SCRIPT_SRC}?client=${ADSENSE_CLIENT}`;
  s.async = true;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}
