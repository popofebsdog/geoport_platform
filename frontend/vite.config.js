import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const backendOrigin = process.env.VITE_BACKEND_ORIGIN
  || process.env.VITE_API_URL?.replace(/\/api\/?$/, '')
  || 'http://localhost:3001'
const titilerOrigin = process.env.VITE_TITILER_ORIGIN || process.env.VITE_TITILER_URL || 'http://localhost:8080'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api/rain': {
        target: 'http://140.113.16.140',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rain/, '/rain')
      },
      '^/api/(?!debug)': {
        target: backendOrigin,
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: backendOrigin,
        changeOrigin: true,
        secure: false
      },
      '/data': {
        target: backendOrigin,
        changeOrigin: true,
        secure: false
      },
      '/titiler': {
        target: titilerOrigin,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/titiler/, '')
      }
    }
  }
}) 
