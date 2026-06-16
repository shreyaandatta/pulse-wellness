import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'sw-push.js'],
      // Pull our push/notificationclick handlers into the generated SW without
      // disturbing the auto-generated offline precache.
      workbox: { importScripts: ['sw-push.js'] },
      manifest: {
        name: 'Pulse — Wellness Tracker',
        short_name: 'Pulse',
        description: 'A warm, minimal daily wellness tracker. Log water, workouts, meals, sleep, mood & steps with a daily wellness score, streaks and trends. 100% local.',
        theme_color: '#E89414',
        background_color: '#FFFAF2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // App-icon long-press / quick actions — jump straight into logging.
        // App.jsx reads the ?log= param and opens the quick-log sheet (water/
        // steps/mood) or the relevant card (meal).
        shortcuts: [
          { name: 'Log water', short_name: 'Water', url: './?log=water', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Add steps', short_name: 'Steps', url: './?log=steps', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Log mood', short_name: 'Mood', url: './?log=mood', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Log a meal', short_name: 'Meal', url: './?log=meal', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
})
