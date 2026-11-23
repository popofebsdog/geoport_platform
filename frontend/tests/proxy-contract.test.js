import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer as createViteServer } from 'vite'
import { loadSource } from './load-source.js'

for (const { label, api, files, tiler } of [
  { label: '/', api: '/api', files: '', tiler: '/titiler' },
  { label: '/gateway', api: '/gateway/api', files: '/gateway', tiler: '/gateway/titiler' },
  { label: 'overlapping defaults', api: '/api/v2', files: '/uploads/v2', tiler: '/titiler/v2' },
  { label: 'shared prefix', api: '/shared', files: '/shared', tiler: '/shared/tiles' }
]) test(`live Vite proxies preserve backend paths with public prefix ${label}`, async t => {
  async function upstream(service) {
    const server = createHttpServer((request, response) => {
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ service, path: request.url, host: request.headers.host }))
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    t.after(() => new Promise(resolve => server.close(resolve)))
    return `http://127.0.0.1:${server.address().port}`
  }
  const backend = await upstream('backend')
  const tiles = await upstream('titiler')
  const directory = await mkdtemp(join(tmpdir(), 'geoport-proxy-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const keys = ['VITE_API_URL', 'VITE_STATIC_URL', 'VITE_BACKEND_ORIGIN', 'VITE_TITILER_URL', 'VITE_TITILER_ORIGIN']
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  keys.forEach(key => delete process.env[key])
  t.after(() => keys.forEach(key => saved[key] === undefined ? delete process.env[key] : process.env[key] = saved[key]))
  await writeFile(join(directory, '.env.integration'), `VITE_API_URL=${api}\nVITE_STATIC_URL=${files}\nVITE_TITILER_URL=${tiler}\nVITE_BACKEND_ORIGIN=${backend}\nVITE_TITILER_ORIGIN=${tiles}\n`)
  const { default: define } = await loadSource('vite.config.js', {}, directory)
  const config = define({ mode: 'integration' })
  const server = await createViteServer({
    ...config, configFile: false, root: directory, envDir: directory,
    optimizeDeps: { disabled: true }, logLevel: 'silent',
    server: { ...config.server, host: '127.0.0.1', port: 0, open: false }
  })
  t.after(() => server.close())
  await server.listen()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  for (const path of ['/api/projects/7?include=files', '/uploads/a%20b.jpg', '/data/geojson/roads.geojson']) {
    const publicPath = path.startsWith('/api/') ? `${api}${path.slice(4)}` : `${files}${path}`
    const response = await fetch(`${base}${publicPath}`)
    assert.equal(response.status, 200)
    const result = await response.json()
    assert.deepEqual(result, { service: 'backend', path, host: new URL(backend).host })
  }
  const path = '/cog/info.geojson?url=http%3A%2F%2Fbackend%3A3001%2Fuploads%2Fmap_cog.tif'
  assert.deepEqual(await fetch(`${base}${tiler}${path}`).then(response => response.json()), {
    service: 'titiler', path, host: new URL(tiles).host
  })
})
