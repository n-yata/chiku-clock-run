import { defineConfig } from 'vite';

// GitHub Pages では `https://<user>.github.io/<repo>/` 配下に配置されるため、
// `base` を CI から VITE_BASE_PATH で渡す。ローカル開発時は '/' で動作。
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    target: 'es2022',
    sourcemap: true
  }
});
