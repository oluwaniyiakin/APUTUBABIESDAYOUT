/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// ============================================================
// APUTU: Baby's Day Out — vite.config.ts
// Zero-plugin static build: TypeScript + CSS are handled by
// Vite's built-in pipeline. `public/` is copied to the build
// output root as-is (favicon, manifest). `assets/` at the repo
// root holds source design assets (currently placeholders,
// since art is Canvas-drawn/emoji and audio is synthesized) —
// it is NOT auto-served; import from it explicitly if it ever
// contains real files you want bundled.
// ============================================================
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
  server: {
    port: 5173,
    open: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
