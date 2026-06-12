/* Web-Push handlers for Pulse, imported into the generated service worker via
   vite-plugin-pwa's workbox.importScripts. Kept separate so the auto-generated
   offline precaching stays exactly as it was. */

// A push arrived from our server — show the notification.
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { /* non-JSON */ }

  const title = payload.title || 'Pulse';
  const options = {
    body: payload.body || 'Time for a quick check-in.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'pulse-reminder',   // collapse repeats into one
    renotify: true,
    data: { url: payload.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an open Pulse tab, or opens a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});
