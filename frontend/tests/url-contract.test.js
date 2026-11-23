import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import axios from 'axios'
import { loadSource } from './load-source.js'

const env = {
  VITE_API_URL: 'https://api.example.test/gateway/api/',
  VITE_STATIC_URL: 'https://static.example.test/assets/',
  VITE_TITILER_URL: '/titiler',
  VITE_TITILER_ASSET_ORIGIN: 'http://backend:3001'
}

function browser(t) {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ success: true, data: [] }) }))
  const previous = { window: globalThis.window, localStorage: globalThis.localStorage }
  globalThis.window = { location: { origin: 'https://app.example.test', pathname: '/projects/7' } }
  globalThis.localStorage = { getItem: () => 'test-token', removeItem() {} }
  t.after(() => Object.assign(globalThis, previous))
}

test('Axios uses configured API base and preserves request/response contracts', async t => {
  browser(t)
  const { default: api, projectAPI, dataFileAPI } = await loadSource('src/services/api.js', env)
  const requests = []
  api.defaults.adapter = async config => {
    requests.push({ url: api.getUri(config), token: config.headers.Authorization, timeout: config.timeout })
    return { data: { success: true, data: { id: 7 } }, status: 200, headers: {}, config }
  }
  assert.deepEqual(await projectAPI.getById(7), { success: true, data: { id: 7 } })
  await dataFileAPI.upload(new FormData())
  assert.deepEqual(requests, [
    { url: 'https://api.example.test/gateway/api/projects/7', token: 'Bearer test-token', timeout: 30000 },
    { url: 'https://api.example.test/gateway/api/data/upload', token: 'Bearer test-token', timeout: 0 }
  ])
})

test('unset API/static configuration keeps same-origin URLs', async t => {
  browser(t)
  const { default: api } = await loadSource('src/services/api.js')
  assert.equal(api.getUri({ url: '/projects/7' }), '/api/projects/7')
  const { default: upload } = await loadSource('src/components/uploads/FeatureUploadModal.vue')
  assert.equal(upload.methods.getFileUrl('uploads/photo.jpg'), '/uploads/photo.jpg')
})

for (const file of ['views/ProjectDetail.vue', 'components/uploads/FeatureUploadModal.vue']) {
  test(`${file} resolves every attachment URL without changing external URLs`, async t => {
    browser(t)
    const { default: component } = await loadSource(`src/${file}`, env)
    for (const path of ['/uploads/photo.jpg?download=1', 'uploads/photo.jpg?download=1']) {
      assert.equal(component.methods.getFileUrl(path), 'https://static.example.test/assets/uploads/photo.jpg?download=1')
    }
    assert.equal(component.methods.getFileUrl('https://other.test/photo.jpg'), 'https://other.test/photo.jpg')
    assert.equal(component.methods.getFileUrl(''), '')
  })
}

for (const name of ['DisasterPointViewModal', 'DisasterPointBrowseModal']) {
  test(`${name} resolves media and thumbnail fallback using static base`, async t => {
    browser(t)
    const { default: component } = await loadSource(`src/components/project/${name}.vue`, env)
    assert.equal(component.methods.getMediaUrl({ storage_path: '/uploads/photo.jpg' }), 'https://static.example.test/assets/uploads/photo.jpg')
    assert.equal(component.methods.getMediaUrl({ thumbnail_path: '/uploads/thumb.jpg' }), 'https://static.example.test/assets/uploads/thumb.jpg')
    assert.equal(component.methods.getMediaUrl({ storage_path: 'https://other.test/photo.jpg' }), 'https://other.test/photo.jpg')
  })
}

test('image record list resolves stored URLs and preserves remote media', async t => {
  browser(t)
  const { default: component } = await loadSource('src/components/project/ImageRecordModal.vue', env)
  const context = { childProject: { project_id: 7 }, $api: { get: async () => ({ success: true, data: [
    { id: 1, url: '/uploads/photo.jpg', thumbnail: '/uploads/thumb.jpg' },
    { id: 2, url: 'https://other.test/photo.jpg', thumbnail: null }
  ] }) } }
  await component.methods.loadMediaList.call(context)
  assert.equal(context.mediaList[0].url, 'https://static.example.test/assets/uploads/photo.jpg')
  assert.equal(context.mediaList[0].thumbnail, 'https://static.example.test/assets/uploads/thumb.jpg')
  assert.equal(context.mediaList[1].url, 'https://other.test/photo.jpg')
  assert.equal(context.isLoading, false)
})

test('gallery media API follows API base rather than static base', async t => {
  browser(t)
  const { default: component } = await loadSource('src/components/project/ParentProjectPhotoGalleryModal.vue', env)
  assert.equal(component.methods.getMediaUrl({ media_id: 9, storage_path: '/uploads/p.jpg' }), 'https://api.example.test/gateway/api/media/9')
})

test('warning callers preserve API routes, encoded parameters and response data', async t => {
  browser(t)
  const layers = [{ layer_type: 'road', storage_path: 'uploads/a b.geojson' }]
  globalThis.fetch = t.mock.fn(async () => ({ ok: true, json: async () => ({ success: true, data: layers }) }))
  const { default: early } = await loadSource('src/views/EarlyWarning.vue', env)
  const context = { monitoringLayersRequestId: 0 }
  await early.methods.fetchMonitoringLayers.call(context, 'a/b')
  assert.equal(globalThis.fetch.mock.calls[0].arguments[0], 'https://api.example.test/gateway/api/warning-regions/a%2Fb/layers')
  assert.equal(context.monitoringLayers.road.fileUrl, 'https://api.example.test/gateway/api/warning-regions/monitoring-file?path=uploads%2Fa%20b.geojson')
  const { default: panel } = await loadSource('src/components/warning/RegionManagePanel.vue', env)
  const panelContext = { regionCode: 'a/b', layersRequestId: 0 }
  await panel.methods.fetchLayers.call(panelContext)
  assert.equal(globalThis.fetch.mock.calls[1].arguments[0], 'https://api.example.test/gateway/api/warning-regions/a%2Fb/layers')
  assert.deepEqual(panelContext.layers, layers)
})

test('bbox API caller preserves query and GeoJSON response', async t => {
  browser(t)
  const geojson = { type: 'FeatureCollection', features: [] }
  globalThis.fetch = t.mock.fn(async () => ({ ok: true, json: async () => geojson }))
  const { default: component } = await loadSource('src/components/MapComponent.vue', env)
  let received
  await component.methods._loadDodshpByBBox.call({
    map: { getBounds: () => ({ getWest: () => 121, getSouth: () => 24, getEast: () => 122, getNorth: () => 25 }) },
    _dodshpLayer: { clearLayers() {}, addData(data) { received = data } }
  })
  const url = new URL(globalThis.fetch.mock.calls[0].arguments[0], window.location.origin)
  assert.equal(url.origin + url.pathname, 'https://api.example.test/gateway/api/spatial/dodshp/bbox')
  assert.equal(url.searchParams.get('xmin'), '121.000000')
  assert.equal(url.searchParams.get('limit'), '2000')
  assert.equal(received, geojson)
})

test('rainfall direct Axios caller preserves its non-intercepted response contract', async t => {
  browser(t)
  const get = t.mock.method(axios, 'get', async () => ({ data: { success: true, source: 'external_api', data: [12] } }))
  const { default: component } = await loadSource('src/components/warning/charts/RainfallChart.vue', env)
  const context = { regionCode: 'north', dataRequestId: 0, $nextTick: async () => {}, markChartReady() {} }
  await component.methods.loadDataForDate.call(context, '2026-01-02')
  assert.equal(get.mock.calls[0].arguments[0], 'https://api.example.test/gateway/api/warning-regions/north/data')
  assert.deepEqual(get.mock.calls[0].arguments[1].params, { dataType: 'chart2', useExternalApi: 'true', date: '2026-01-02' })
  assert.deepEqual(context.chartData, [12])
})

test('road GeoJSON caller uses static base and still parses available roads', async t => {
  browser(t)
  globalThis.fetch = t.mock.fn(async () => ({ json: async () => ({ features: [{ properties: { 公路編: '台7線' } }] }) }))
  const { default: component } = await loadSource('src/components/warning/CreateRegionProject.vue', env)
  const context = {}
  await component.methods.loadRoadSections.call(context)
  assert.equal(globalThis.fetch.mock.calls[0].arguments[0], 'https://static.example.test/assets/uploads/monitoring/taiwan7/alertRoad.geojson')
  assert.deepEqual(context.availableRoads, [{ value: '台7線', label: '台7線' }])
})

test('COG info and ProjectDetail locate use the same internal asset URL', async t => {
  browser(t)
  globalThis.fetch = t.mock.fn(async () => ({ ok: true, json: async () => ({ bbox: [121, 24, 122, 25] }) }))
  const { BaseMapService } = await loadSource('src/services/BaseMapService.js', env)
  const service = new BaseMapService()
  const info = await service.fetchTiTilerBounds('/uploads/map_cog.tif?version=2')
  assert.deepEqual(info.bounds, [[24, 121], [25, 122]])
  assert.equal(new URL(globalThis.fetch.mock.calls[0].arguments[0], window.location.origin).searchParams.get('url'), 'http://backend:3001/uploads/map_cog.tif?version=2')
  const { default: detail } = await loadSource('src/views/ProjectDetail.vue', env)
  const fits = []
  await detail.methods.locateCOGBaseMap.call({
    $refs: { projectMap: { baseMapService: service, map: { fitBounds: bounds => fits.push(bounds) } } },
    showAlert() {}
  }, { storagePath: '/uploads/map_cog.tif?version=2', name: 'map' })
  assert.equal(globalThis.fetch.mock.calls[1].arguments[0], globalThis.fetch.mock.calls[0].arguments[0])
  assert.deepEqual(fits, [[[24, 121], [25, 122]]])
  assert.equal(service.getTiTilerAssetUrl('https://external.test/map.tif'), 'https://external.test/map.tif')
})

test('relative static prefixes become absolute only for TiTiler, not browser downloads', async t => {
  browser(t)
  const { BaseMapService } = await loadSource('src/services/BaseMapService.js', { ...env, VITE_STATIC_URL: '/assets/' })
  const service = new BaseMapService()
  assert.equal(service.getTiTilerAssetUrl('/uploads/map_cog.tif'), 'http://backend:3001/uploads/map_cog.tif')
  const { default: upload } = await loadSource('src/components/uploads/FeatureUploadModal.vue', { VITE_STATIC_URL: '/assets/' })
  assert.equal(upload.methods.getFileUrl('/uploads/photo.jpg'), '/assets/uploads/photo.jpg')
})

test('COG strips only browser static prefix and preserves explicit internal base path', async t => {
  browser(t)
  const { BaseMapService } = await loadSource('src/services/BaseMapService.js', {
    ...env, VITE_TITILER_ASSET_ORIGIN: 'http://backend:3001/internal/'
  })
  const service = new BaseMapService()
  for (const path of ['/uploads/map_cog.tif?x=1', 'https://static.example.test/assets/uploads/map_cog.tif?x=1']) {
    assert.equal(service.getTiTilerAssetUrl(path), 'http://backend:3001/internal/uploads/map_cog.tif?x=1')
  }
  for (const path of ['https://external.test/assets/uploads/map.tif', 'https://static.example.test/elsewhere/map.tif', 'https://static.example.test/assets-other/map.tif']) {
    assert.equal(service.getTiTilerAssetUrl(path), path)
  }
})

test('COG locate preserves a useful 404 error when TiTiler returns a non-JSON body', async t => {
  browser(t)
  globalThis.fetch = t.mock.fn(async () => ({ ok: false, status: 404, json: async () => { throw new SyntaxError('Not JSON') } }))
  const { BaseMapService } = await loadSource('src/services/BaseMapService.js', env)
  const { default: detail } = await loadSource('src/views/ProjectDetail.vue', env)
  let alert
  await detail.methods.locateCOGBaseMap.call({
    $refs: { projectMap: { baseMapService: new BaseMapService(), map: {} } },
    showAlert(value) { alert = value }
  }, { storagePath: '/uploads/missing_cog.tif', name: 'missing' })
  assert.equal(alert.type, 'error')
  assert.match(alert.message, /伺服器找不到此影像檔案/)
})

test('shared static URLs handle same-origin absolute paths and remain idempotent', async t => {
  browser(t)
  const { staticUrl } = await loadSource('src/utils/urls.js', env)
  assert.equal(staticUrl('https://app.example.test/uploads/photo.jpg?x=1#preview'), 'https://static.example.test/assets/uploads/photo.jpg?x=1#preview')
  assert.equal(staticUrl('data/chart.csv'), 'https://static.example.test/assets/data/chart.csv')
  assert.equal(staticUrl('uploads\\photo.jpg'), 'https://static.example.test/assets/uploads/photo.jpg')
  for (const path of ['https://other.test/photo.jpg', 'blob:https://app.example.test/preview', 'data:image/png;base64,AAAA', 'https://static.example.test/assets/uploads/photo.jpg']) {
    assert.equal(staticUrl(path), path)
  }
  const { staticUrl: relative } = await loadSource('src/utils/urls.js', { VITE_STATIC_URL: '/assets/' })
  assert.equal(relative(relative('/uploads/photo.jpg')), '/assets/uploads/photo.jpg')
})

test('InSAR preserves API monitoring URLs with CDN static hosting and relative API bases', async t => {
  browser(t)
  for (const apiBase of ['/api', '/gateway/api', 'https://api.example.test/api']) {
    const config = { ...env, VITE_API_URL: apiBase }
    const geojson = { type: 'FeatureCollection', features: [] }
    globalThis.fetch = t.mock.fn(async () => ({ ok: true, json: async () => geojson }))
    const { apiUrl } = await loadSource('src/utils/urls.js', config)
    const { default: insar } = await loadSource('src/components/warning/InSARLayer.vue', config)
    const url = apiUrl('/warning-regions/monitoring-file?path=uploads%2Finsar.geojson')
    let rendered = false
    const context = { map: {}, dataPath: url, renderLayer() { rendered = true } }
    await insar.methods.loadInSARData.call(context)
    assert.equal(globalThis.fetch.mock.calls[0].arguments[0], url)
    assert.equal(context.insarData, geojson)
    assert.equal(rendered, true)
  }
})

test('Vite loads selected mode env and proxy targets are origins, never relative paths', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'geoport-vite-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const keys = ['VITE_API_URL', 'VITE_BACKEND_ORIGIN', 'VITE_STATIC_URL', 'VITE_TITILER_URL', 'VITE_TITILER_ORIGIN']
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  keys.forEach(key => delete process.env[key])
  t.after(() => keys.forEach(key => saved[key] === undefined ? delete process.env[key] : process.env[key] = saved[key]))
  await writeFile(join(directory, '.env.production'), 'VITE_API_URL=/api\nVITE_TITILER_URL=/titiler\nVITE_BACKEND_ORIGIN=http://backend:3001/nested\nVITE_TITILER_ORIGIN=http://titiler:8080/base\n')
  const { default: definition } = await loadSource('vite.config.js', {}, directory)
  const config = typeof definition === 'function' ? definition({ mode: 'production' }) : definition
  const proxy = config.server.proxy
  assert.equal(proxy['^/api/(?!debug)'].target, 'http://backend:3001')
  assert.equal(proxy['/titiler'].target, 'http://titiler:8080')
  assert.equal(proxy['/uploads'].target, 'http://backend:3001')
  assert.equal(proxy['/titiler'].rewrite('/titiler/cog/info.geojson?url=x'), '/cog/info.geojson?url=x')
  assert.equal(proxy['/api/rain'].rewrite('/api/rain/stations'), '/rain/stations')
  await writeFile(join(directory, '.env.relative'), 'VITE_API_URL=/api\nVITE_TITILER_URL=/titiler\n')
  const relative = typeof definition === 'function' ? definition({ mode: 'relative' }) : definition
  assert.equal(relative.server.proxy['^/api/(?!debug)'].target, 'http://localhost:3001')
  assert.equal(relative.server.proxy['/titiler'].target, 'http://localhost:8080')
  await writeFile(join(directory, '.env.remote'), 'VITE_API_URL=https://api.example.test/prefix/api\nVITE_STATIC_URL=https://static.example.test/assets\nVITE_TITILER_URL=https://tiles.example.test/titiler\n')
  const remote = typeof definition === 'function' ? definition({ mode: 'remote' }) : definition
  assert.equal(remote.server.proxy['^/api/(?!debug)'].target, 'https://api.example.test')
  assert.equal(remote.server.proxy['/uploads'].target, 'https://static.example.test')
  assert.equal(remote.server.proxy['/data'].target, 'https://static.example.test')
  assert.equal(remote.server.proxy['/titiler'].target, 'https://tiles.example.test')
})
