import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages では `https://<user>.github.io/<repo>/` 配下に配置されるため、
// `base` を CI から VITE_BASE_PATH で渡す。ローカル開発時は '/' で動作。
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // 'script' は独立ファイル (registerSW.js) を生成するため
      // script-src 'self' の CSP でインラインスクリプトなしに登録できる
      injectRegister: 'script',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'mario-game',
        short_name: 'mario-game',
        description: 'Browser-based 2D side-scrolling platformer.',
        lang: 'ja',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png',          sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png',          sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsInlineLimit: 0
  }
});
