import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

function absoluteOrigin(...values) {
  for (const value of values) {
    try {
      const url = new URL(value)
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin
    } catch {
      // Relative public URLs are routes, not proxy targets.
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const backendOrigin = absoluteOrigin(env.VITE_BACKEND_ORIGIN, env.VITE_API_URL, 'http://localhost:3001')
  const staticOrigin = absoluteOrigin(env.VITE_STATIC_URL, backendOrigin)
  const titilerOrigin = absoluteOrigin(env.VITE_TITILER_ORIGIN, env.VITE_TITILER_URL, 'http://localhost:8080')
  const relativePrefix = value => value?.startsWith('/') && !value.startsWith('//') ? value.replace(/\/+$/, '') : ''
  const proxyAliases = {}
  for (const [value, defaultPrefix, replacement, target] of [
    [env.VITE_API_URL, '/api', '/api', backendOrigin],
    [env.VITE_TITILER_URL, '/titiler', '', titilerOrigin]
  ]) {
    const prefix = relativePrefix(value)
    if (prefix && prefix !== defaultPrefix) {
      proxyAliases[prefix] = { target, changeOrigin: true, secure: false,
        rewrite: path => `${replacement}${path.slice(prefix.length)}` }
    }
  }
  const staticPrefix = relativePrefix(env.VITE_STATIC_URL)
  if (staticPrefix) {
    for (const namespace of ['uploads', 'data']) {
      proxyAliases[`${staticPrefix}/${namespace}`] = { target: staticOrigin, changeOrigin: true, secure: false,
        rewrite: path => path.slice(staticPrefix.length) }
    }
  }
  return {
    plugins: [vue()],
    esbuild: { drop: ['console', 'debugger'] },
    optimizeDeps: { esbuildOptions: { drop: ['console', 'debugger'] } },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        ...Object.fromEntries(Object.entries(proxyAliases).sort(([a], [b]) => b.length - a.length)),
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
          target: staticOrigin,
          changeOrigin: true,
          secure: false
        },
        '/data': {
          target: staticOrigin,
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
  }
})
