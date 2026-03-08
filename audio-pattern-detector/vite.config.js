import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/audio-pattern-detector/',
  build: {
    outDir: '../docs/audio-pattern-detector',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0'
  },
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
  },
})
