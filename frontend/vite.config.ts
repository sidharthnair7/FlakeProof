import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // `npm run dev` reads recorded runs from the FastAPI app: python -m uvicorn dashboard.app:app --port 8000
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
