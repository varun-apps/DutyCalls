import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/icon-192.png'],
      manifest: {
        name: 'DutyCalls',
        short_name: 'DutyCalls',
        description: 'Shared daily todo list for families and teams',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        // Never let the service worker intercept Supabase API/Realtime/Auth traffic
        navigateFallbackDenylist: [/^\/auth\/v1\//, /^\/rest\/v1\//, /^\/realtime\/v1\//]
      },
      devOptions: { enabled: false }
    })
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') }
  },
  server: {
    port: 5173,
    host: true
  }
})
