import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/todo-list/',
  build: {
    outDir: '../docs/todo-list',
    emptyOutDir: true,
    // CodeMirror 作为懒加载 chunk，单独加载时会超过默认警告阈值。
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
  },
  plugins: [react()],
})
