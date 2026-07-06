/// <reference types="vitest" />
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  base: '/',
  envDir: resolve(import.meta.dirname, '../apps/Warp12'),
  plugins: [react()],
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
    name: '@warp12/leaderboard',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
  },
});
