import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    open: true,
    historyApiFallback: true,
    proxy: {
      '^/api/(?!debug)': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/api/rain': {
        target: 'http://140.113.16.140',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rain/, '/rain')
      },
      '/data': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
}) 