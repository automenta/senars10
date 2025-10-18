import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, '../core'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.jsx'],
    include: ['**/*.test.{js,jsx,ts,tsx}'],
    css: true,
    testTimeout: 3000,
    fileParallelism: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        useAtomics: true
      }
    },
    environmentOptions: {
      jsdom: {
        pretendToBeVisual: true,
        resources: 'usable'
      }
    }
  },
})
