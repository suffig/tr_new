import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/tr_lite/', // <-- Für GitHub Pages im Unterverzeichnis!
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'FUSTA - FIFA Statistik-Tracker',
        short_name: 'FUSTA',
        description: 'FUSTA - Verfolge FIFA-Spiele, Spieler, Sperren und Finanzen mit modernem Design',
        theme_color: '#2E7D32',
        background_color: '#2E7D32',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'de',
        categories: ['sports', 'games'],
        icons: [
          {
            src: 'assets/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'assets/icon-512.png',
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