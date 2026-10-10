import { defineConfig } from 'vite';

export default defineConfig({
  base: '/alchemy-arena/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
