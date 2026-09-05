import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('canvas-confetti')) return 'confetti'
            if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
            return 'vendor'
          }
          if (id.includes('/src/data/courses/')) return 'curriculum'
        },
      },
    },
  },
})
