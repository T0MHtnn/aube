import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: { port: 5174, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Aube',
        short_name: 'Aube',
        description: 'Ton tableau de bord du matin',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#EEF2F7',
        theme_color: '#EEF2F7',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Les fonctions serveur (/api/...) ne doivent jamais être servies par le cache
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
