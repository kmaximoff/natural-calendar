import { defineConfig } from 'vite';

export default defineConfig({
  base: '/natural-calendar/', // GitHub Pages base path
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
