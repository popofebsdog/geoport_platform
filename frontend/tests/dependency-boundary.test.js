import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'vite'
import { fileURLToPath } from 'node:url'

test('unused legacy raster build tools are not shipped to browsers', async () => {
  const modules = new Set()
  await build({ root: fileURLToPath(new URL('../', import.meta.url)), logLevel: 'silent',
    build: { write: false }, plugins: [{ name: 'verify-dependency-boundary',
      generateBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) if (chunk.type === 'chunk') {
          for (const name of Object.keys(chunk.modules)) modules.add(name)
        }
      }
    }] })
  assert.ok([...modules].some(name => name.includes('/georaster/')))
  assert.equal([...modules].filter(name => /\/node_modules\/(?:webpack|worker-loader|source-map-resolve|decode-uri-component)\//.test(name)).length, 0)
})
