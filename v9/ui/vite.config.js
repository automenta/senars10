import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, '../core'),
    },
  },
  server: {
    host: true, // Bind to all interfaces (0.0.0.0)
    port: 3000,
    open: false, // Don't automatically open browser
    strictPort: false, // Don't fail if the port is already in use
    allowedHosts: true, // Allow connections from any host
  },
  build: {
    outDir: 'dist',
  }
})
