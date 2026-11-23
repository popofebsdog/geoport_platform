import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadSource } from './load-source.js'

const publications = await loadSource('src/services/publicationService.js').catch(() => ({}))
test('share links keep credentials in a fragment rather than server-visible paths or queries', () => {
  assert.equal(typeof publications.buildShareUrl, 'function')
  const token = 'a'.repeat(43)
  const url = new URL(publications.buildShareUrl(token, 'https://geoport.example'))
  assert.equal(url.pathname, '/shared-project')
  assert.equal(url.search, '')
  assert.equal(url.hash, `#${token}`)
})
test('guest reads use only the share header and do not send account credentials', async t => {
  assert.equal(typeof publications.readSharedProject, 'function')
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ success: true, data: { project: { name: 'Fixture' } } }), { status: 200 })
  })
  const token = 'a'.repeat(43)
  await publications.readSharedProject(token)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url.includes(token), false)
  assert.equal(calls[0].options.headers['X-Share-Token'], token)
  assert.equal(calls[0].options.credentials, 'omit')
  assert.equal(calls[0].options.headers.Authorization, undefined)
})

test('report charts select their observation date in Taiwan, not today', async () => {
  const { default: component } = await loadSource('src/components/project/ProjectPublicationSnapshot.vue')
  const context = { snapshot: { charts: { chart2: { dataStatus: 'historical', observedAt: '2026-11-20T18:00:00Z', time_series: [{ hourly: 12 }] } } } }
  const charts = component.computed.charts.call(context)
  assert.equal(charts[0].date, '2026-11-21')
})

test('private fetch authenticates configured API/static paths but never third-party URLs', async t => {
  const previous = { window: globalThis.window, localStorage: globalThis.localStorage }
  globalThis.window = { location: { origin: 'https://app.test' } }
  globalThis.localStorage = { getItem: () => 'private-account-token' }
  t.after(() => Object.assign(globalThis, previous))
  const calls = []; t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return {} })
  const { fetchWithAccount } = await loadSource('src/utils/urls.js', { VITE_API_URL: 'https://api.test/api', VITE_STATIC_URL: 'https://assets.test/files' })
  for (const url of ['https://api.test/api/projects', 'https://assets.test/files/uploads/map.tif']) await fetchWithAccount(url)
  for (const call of calls) { assert.equal(new Headers(call.options.headers).get('authorization'), 'Bearer private-account-token'); assert.equal(call.options.credentials, 'include') }
  for (const url of ['https://evil.test/uploads/map.tif', 'https://api.test/api-other/projects', 'https://assets.test/elsewhere/file']) await fetchWithAccount(url)
  for (const call of calls.slice(2)) assert.equal(new Headers(call.options?.headers).get('authorization'), null)
})

test('the shared warning map filters a multi-road file to the selected road and work section', async () => {
  const { default: map } = await loadSource('src/components/project/PublicationMap.vue', {}, undefined, { 'leaflet/dist/leaflet.css': 'export default {}' })
  const data = { type: 'FeatureCollection', features: [
    { properties: { 公路編: '台7線', 工務段: '復興工務段' } },
    { properties: { 公路編: '台7線', 工務段: '其他工務段' } },
    { properties: { 公路編: '台8臨37線', 工務段: '復興工務段' } }
  ] }
  const result = map.methods.scopedRoad.call({ snapshot: { project: { road: 'taiwan7', description: '工務段：復興工務段' } } }, data)
  assert.equal(result.features.length, 1)
  assert.equal(result.features[0], data.features[0])
})

test('report preview uses the server wording contract and its bounded evidence selection', async () => {
  const { default: component } = await loadSource('src/components/project/ProjectPublicationSnapshot.vue')
  const report = { specVersion: '1.0', sections: [{ id: 'basic', title: '一、基本資訊' }], photos: [
    { id: 'm2', caption: '拍攝時間：未提供；上傳時間：2026/11/22' }
  ], appendix: { records: [] } }
  const context = { snapshot: { report, media: [{ id: 'm1', collection: 'media' }, { id: 'm2', collection: 'media' }] } }
  assert.equal(component.computed.report.call(context), report)
  const photos = component.computed.photos.call(context)
  assert.deepEqual(photos.map(photo => photo.id), ['m2'])
  assert.equal(photos[0].caption, report.photos[0].caption)
  assert.equal(photos[0].collection, 'media')
})
test('preview loads the server-selected main and appendix evidence, including older owned photos', async () => {
  const { default: component } = await loadSource('src/components/project/ProjectPublicationSnapshot.vue')
  const evidence = [{ id: 'older', caption: '對應調查照片' }, { id: 'appendix', caption: '附錄照片' }]
  const snapshot = { report: { embeddedPhotos: evidence }, media: [
    { id: 'newer', collection: 'media' }, { id: 'older', collection: 'media' }, { id: 'appendix', collection: 'media' }
  ] }
  const images = component.computed.embeddedPhotos.call({ snapshot })
  assert.deepEqual(images.map(photo => photo.id), ['older', 'appendix'])
  assert.equal(images[0].collection, 'media')
  assert.equal(images[0].caption, evidence[0].caption)
})
