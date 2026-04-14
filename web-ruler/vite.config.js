import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/web-ruler/',
  build: {
    outDir: '../docs/web-ruler',
    emptyOutDir: true,
  },
  server: {
    port: 3000
  },
  plugins: [react()],
})
