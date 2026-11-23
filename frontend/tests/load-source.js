import { build } from 'esbuild'
import { parse } from '@vue/compiler-sfc'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(frontendRoot, 'package.json'))

// Compile real scripts without mounting UI or loading browser-only map/chart libraries.
export async function loadSource(path, env = {}, configDir, stubs = {}) {
  const entry = resolve(frontendRoot, path)
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs',
    packages: 'external', logLevel: 'silent',
    alias: { '@': resolve(frontendRoot, 'src') },
    define: {
      'import.meta.env': JSON.stringify({ VITE_LOG_LEVEL: 'silent', ...env }),
      ...(configDir ? { __dirname: JSON.stringify(configDir) } : {})
    },
    plugins: [{
      name: 'script-only',
      setup(plugin) {
        plugin.onResolve({ filter: /.*/ }, args => Object.hasOwn(stubs, args.path) ? { path: args.path, namespace: 'test-stub' } : undefined)
        plugin.onLoad({ filter: /.*/, namespace: 'test-stub' }, args => ({ contents: stubs[args.path] }))
        plugin.onResolve({ filter: /^(leaflet|vue3-apexcharts)$/ }, args => ({ path: args.path, namespace: 'ui-stub' }))
        plugin.onLoad({ filter: /.*/, namespace: 'ui-stub' }, () => ({ contents: 'export default {}' }))
        plugin.onLoad({ filter: /\.vue$/ }, async args => ({
          contents: args.path === entry ? parse(await readFile(args.path, 'utf8')).descriptor.script.content : 'export default {}',
          resolveDir: dirname(args.path), loader: 'js'
        }))
      }
    }]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
