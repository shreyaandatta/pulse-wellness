import { useCallback, useEffect, useState } from 'react';
import { adsConfigured, getAdConsent, setAdConsent, loadAdSense } from '../lib/ads.js';

// Owns ad state for the app. Ads are "active" only for free users when AdSense is
// configured. We track the consent choice and load the library once it's made.
export function useAds({ plus }) {
  const active = adsConfigured && !plus;
  const [consent, setConsentState] = useState(() => getAdConsent());

  // Load AdSense (personalised or not) as soon as a free user has chosen.
  useEffect(() => {
    if (active && consent) loadAdSense(consent === 'personalized');
  }, [active, consent]);

  const choose = useCallback((v) => { setAdConsent(v); setConsentState(v); }, []);

  return {
    active,                              // free user + configured
    consent,                             // '' | 'personalized' | 'declined'
    needsConsent: active && !consent,    // show the consent banner
    canShowAds: active && Boolean(consent), // ad slots may render
    choose,
  };
}
