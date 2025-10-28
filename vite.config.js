// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic', // required for h()
    }),
  ],
  root: 'ui/web',
  build: {
    outDir: '../../dist/web',
    rollupOptions: {
      input: 'ui/web/index.html',
    },
  },
});