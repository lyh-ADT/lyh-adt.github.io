import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/todo-list/',
  build: {
    outDir: '../docs/todo-list',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
  },
  plugins: [react()],
})
