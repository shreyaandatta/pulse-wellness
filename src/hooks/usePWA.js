import { useEffect, useState } from 'react';

// Tracks installability + offline status for the "Install Pulse" card.
// The browser fires `beforeinstallprompt` when the app qualifies as a PWA;
// we stash it so the user can trigger install from our own button.
export function usePWA() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPromptEvent(e); };
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); };
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return false;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setPromptEvent(null);
    return outcome === 'accepted';
  };

  return { canInstall: !!promptEvent, installed, online, install };
}
