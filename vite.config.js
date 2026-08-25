import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vite's job: run a fast dev server while you code, and compile everything in
// src/ into a plain index.html + one .js + one .css inside dist/ when you build.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate' = when you deploy a new version, the app quietly swaps to it
      // the next time you open it. No "update available" prompt to build.
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'FuelSense',
        short_name: 'FuelSense',
        description: 'AI-assisted workout, nutrition and water logging.',
        start_url: '/',
        scope: '/',
        // 'standalone' is the setting that makes iOS launch this full-screen
        // with your icon instead of opening it in a Safari tab.
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#141416',
        theme_color: '#141416',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the whole app shell so it opens with no signal (gyms).
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
});
