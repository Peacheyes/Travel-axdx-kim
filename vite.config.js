import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const tourApiProxy = {
  target: 'https://apis.data.go.kr',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/tour/, ''),
  secure: false,
}

const nominatimProxy = {
  target: 'https://nominatim.openstreetmap.org',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
  headers: {
    'User-Agent': 'SaharaTravelApp/1.0 (travel-course-map)',
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/tour': tourApiProxy,
      '/api/nominatim': nominatimProxy,
    },
  },
  preview: {
    proxy: {
      '/api/tour': tourApiProxy,
      '/api/nominatim': nominatimProxy,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
