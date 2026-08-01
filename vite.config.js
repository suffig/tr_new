import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// VITE_BASE_PATH wird von GitHub Actions automatisch auf /<repo-name>/ gesetzt.
// Lokal: npm run build → relative Pfade (funktioniert immer).
const base = process.env.VITE_BASE_PATH ?? './'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      // apple-touch-icon.png liegt im Wurzelverzeichnis: iOS sucht genau dort,
      // wenn kein passendes <link> greift. favicon.ico und masked-icon.svg
      // waren hier gelistet, existierten aber nie.
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'FUSTA - FIFA Statistik-Tracker',
        short_name: 'FUSTA',
        description: 'FUSTA - Verfolge FIFA-Spiele, Spieler, Sperren und Finanzen mit modernem Design',
        theme_color: '#FF6B4A',
        background_color: '#0A1119',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'de',
        categories: ['sports', 'games'],
        icons: [
          {
            src: 'assets/icon-192.png?v=2',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'assets/icon-512.png?v=2',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
})