/// <reference types="vitest" />
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  base: '/',
  envDir: import.meta.dirname,
  plugins: [react()],
  resolve: {
    alias: {
      // tei-core is src-only (file: sibling); point Vite at its entry.
      '@warp12/tei-core': resolve(import.meta.dirname, '../Warp12/libs/tei-core/src/index.ts'),
    },
  },
  server: {
    port: 4210,
    host: 'localhost',
  },
  preview: {
    port: 4310,
    host: 'localhost',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    name: '@iwgf/leaderboard',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
  },
});
