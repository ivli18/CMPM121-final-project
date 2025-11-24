// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/CMPM121-final-project/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
  },
});
