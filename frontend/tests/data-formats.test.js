import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadSource } from './load-source.js'

const component = async file => (await loadSource(file)).default
const instance = (definition, state = {}) => Object.assign({}, definition.data?.(), definition.methods, state)

for (const extension of ['shp', 'gpx', 'csv']) {
  test(`map layer picker rejects unsupported .${extension} without leaving an old file selected`, async () => {
    const modal = instance(await component('src/components/uploads/LayerUploadModal.vue'), { showAlert() {} })
    modal.form.file = { name: 'old.geojson' }
    modal.analysisData = { numericFields: ['old'] }
    await modal.handleFileSelect({ target: { files: [{ name: `test.${extension}` }], value: 'selected' } })
    assert.equal(modal.form.file, null)
    assert.equal(modal.analysisData, null)
  })
}

test('GeoJSON analysis uses extension, not unreliable browser MIME, and resets previous analysis', async () => {
  const modal = instance(await component('src/components/uploads/LayerUploadModal.vue'), { showAlert() {} })
  modal.form.dataType = 'potential_analysis'
  let analyzed = 0
  modal.analyzeGeoJSONForPotential = async () => { analyzed++; return { numericFields: ['risk'], intervals: [] } }
  await modal.handleFileSelect({ target: { files: [{ name: 'TWD97.GEOJSON', type: '' }] } })
  assert.equal(analyzed, 1)
  await modal.handleFileSelect({ target: { files: [{ name: 'another.kml', type: '' }] } })
  assert.equal(modal.analysisData, null)
})

test('map list does not download hidden layer bodies', async () => {
  const definition = await component('src/views/ProjectDetail.vue')
  const requests = []
  const context = { ...definition.methods, project: { projectId: 'project-a' }, geojsonLayers: [], loadedGeojsonLayers: {},
    layerVisibility: { b: true }, initAvailableFeatures: async () => {},
    $api: { get: async url => { requests.push(url); return url.endsWith('geojson-list')
      ? { success: true, data: ['a', 'b', 'c'].map(file_id => ({ file_id })) }
      : { success: true, data: { geojson: { features: [] } } } } } }
  await context.loadGeoJSONLayers()
  assert.deepEqual(requests, ['/data/project/project-a/geojson-list', '/data/project/project-a/geojson?fileId=b'])
  assert.deepEqual(Object.keys(context.loadedGeojsonLayers), ['b'])
})

test('concurrent requests for one vector layer share a fetch and cached layers do not refetch', async () => {
  const definition = await component('src/views/ProjectDetail.vue')
  let requests = 0
  let resolve
  const result = new Promise(done => { resolve = done })
  const context = { ...definition.methods, project: { projectId: 'a' }, geojsonLayers: [{ file_id: 'b' }], loadedGeojsonLayers: {},
    initAvailableFeatures: async () => {}, $api: { get: () => { requests++; return result } } }
  const one = context.loadSpecificGeoJSONLayer('b'), two = context.loadSpecificGeoJSONLayer('b')
  resolve({ success: true, data: { file_id: 'b', geojson: { features: [] } } })
  await Promise.all([one, two])
  await context.loadSpecificGeoJSONLayer('b')
  assert.equal(requests, 1)
})

test('a layer response cannot leak into the next project after navigation', async () => {
  const definition = await component('src/views/ProjectDetail.vue')
  let resolve
  const context = { ...definition.methods, project: { projectId: 'a' }, geojsonLayers: [], loadedGeojsonLayers: {},
    initAvailableFeatures: async () => {}, $api: { get: () => new Promise(done => { resolve = done }) } }
  const pending = context.loadSpecificGeoJSONLayer('old')
  context.project = { projectId: 'b' }
  resolve({ success: true, data: { file_id: 'old', geojson: { features: [] } } })
  await pending
  assert.deepEqual(context.loadedGeojsonLayers, {})
})

test('TWD97 geometry collections and elevation are preserved without copying feature properties', async () => {
  const { convertGeoJsonFromTWD97 } = await loadSource('src/utils/mapGeoUtils.js')
  const properties = { name: 'survey', payload: 'x'.repeat(1000) }
  const input = { type: 'FeatureCollection', features: [{ type: 'Feature', properties,
    geometry: { type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [250000, 2700000, 32] }] } }] }
  const converted = convertGeoJsonFromTWD97(input, ([x, y, ...rest]) => [x / 10000, y / 100000, ...rest])
  assert.deepEqual(converted.features[0].geometry.geometries[0].coordinates, [25, 27, 32])
  assert.deepEqual(input.features[0].geometry.geometries[0].coordinates, [250000, 2700000, 32])
  assert.equal(converted.features[0].properties, properties)
})

test('geometry bounds handle large lines, collections, null geometry, and empty datasets', async () => {
  const { extractAllCoordinates, calculateGeoJSONBounds } = await loadSource('src/utils/mapGeoUtils.js')
  const geometry = { type: 'LineString', coordinates: Array.from({ length: 200000 }, (_, i) => [121 + i / 1e7, 24]) }
  assert.equal(extractAllCoordinates(geometry).length, 200000)
  const collection = { type: 'FeatureCollection', features: [{ geometry: { type: 'GeometryCollection', geometries: [geometry] } }, { geometry: null }] }
  assert.deepEqual(calculateGeoJSONBounds(collection, point => point), { south: 24, north: 24, west: 121, east: 121.0199999 })
  assert.equal(calculateGeoJSONBounds({ features: [{ geometry: null }] }), null)
})

test('basemap upload sends the COG checkbox and clears progress on failure', async t => {
  let submitted
  globalThis.__formatUpload = async form => { submitted = form; throw new Error('fixture upload failure') }
  t.after(() => { delete globalThis.__formatUpload })
  const definition = (await loadSource('src/components/uploads/BaseMapUploadModal.vue', {}, undefined, {
    '@/services/api.js': 'export const dataFileAPI = { upload: form => globalThis.__formatUpload(form) };'
  })).default
  const modal = instance(definition, { projectId: 'project-a', showAlert() {} })
  modal.form = { name: 'Raster', date: '2026-11-22', file: new Blob(['fixture']), enableCOG: false }
  let cleared = false
  t.mock.method(globalThis, 'setInterval', () => 42)
  t.mock.method(globalThis, 'clearInterval', id => { if (id === 42) cleared = true })
  t.mock.method(console, 'error', () => {})
  await modal.handleUpload()
  assert.equal(submitted.get('enable_cog'), 'false')
  assert.equal(cleared, true)
})

test('CSV preview preserves quoted newlines, escaped quotes, and UTF-8 BOM headers', async t => {
  class Reader {
    readAsText(blob) { blob.text().then(text => this.onload({ target: { result: text } })) }
  }
  const previous = globalThis.FileReader
  globalThis.FileReader = Reader
  t.after(() => { globalThis.FileReader = previous })
  const modal = instance(await component('src/components/temporal/TemporalDataUploadModal.vue'))
  const file = new Blob(['\uFEFFtime,note,value\r\n0,"line one\nline ""two""",0\r\n1,plain,2.5\r\n'], { type: 'text/csv' })
  Object.defineProperty(file, 'name', { value: 'survey.csv' })
  modal.parseCSVFile(file)
  for (let n = 0; modal.isParsingFile && n < 100; n++) await new Promise(done => setTimeout(done, 5))
  assert.deepEqual(modal.previewColumns, ['time', 'note', 'value'])
  assert.equal(modal.previewData.length, 2)
  assert.equal(modal.previewData[0].note, 'line one\nline "two"')
  assert.equal(modal.previewData[0].value, '0')
})

test('standard GeoJSON null properties and top-level id=0 initialize feature attachments safely', async () => {
  const definition = await component('src/views/ProjectDetail.vue')
  const context = { ...definition.methods, geojsonData: { geojson: { features: [{ type: 'Feature', id: 0, properties: null, geometry: { type: 'Point', coordinates: [121, 24] } }] } },
    featureUploadForms: {}, featureUploads: {}, featureExpanded: {} }
  await context.initAvailableFeatures()
  assert.equal(context.availableFeatures[0].id, 0)
  assert.ok(context.featureUploadForms[0])
})

test('sidebar treats .json GeoJSON as a displayable layer', async () => {
  const definition = await component('src/components/project/ProjectSidebar.vue')
  const context = { ...definition.methods, uploadedData: [{ file_id: 'a', file_extension: '.json', file_type: 'vector' }], layerOrder: [] }
  assert.equal(definition.computed.allLayers.call(context)[0].isGeojson, true)
})

test('a pending CSV preview cannot repopulate a form after it is reset', async t => {
  let reader
  const previous = globalThis.FileReader
  globalThis.FileReader = class { constructor() { reader = this } readAsText() {} }
  t.after(() => { globalThis.FileReader = previous })
  const modal = instance(await component('src/components/temporal/TemporalDataUploadModal.vue'), { isEditMode: false })
  const file = new Blob(['step,value\n0,0']); Object.defineProperty(file, 'name', { value: 'x.csv' })
  modal.parseCSVFile(file)
  modal.resetForm()
  reader.onload({ target: { result: 'step,value\n0,0' } })
  assert.deepEqual(modal.previewColumns, [])
  assert.deepEqual(modal.previewData, [])
})

test('uploaded layer names, descriptions, and IDs are escaped before tooltip HTML', async t => {
  globalThis.__formatTooltips = []
  t.after(() => { delete globalThis.__formatTooltips })
  const definition = (await loadSource('src/components/project/ProjectMap.vue', {}, undefined, {
    leaflet: `export default { Proj:{CRS:class{}}, CRS:{EPSG4326:{}}, bounds:()=>({}),
      geoJSON(data,options){for(const feature of data.features){options.style?.(feature);options.onEachFeature?.(feature,{bindTooltip:text=>globalThis.__formatTooltips.push(text),on(){}})}
      return {options,addTo(){return this},getBounds:()=>({isValid:()=>false})};} };`,
    proj4leaflet: 'export default {}'
  })).default
  const context = instance(definition, { map: { hasLayer: () => true }, featureUploads: {}, $emit() {} })
  context.addGeojsonLayerToMap('x', { file_name: '<img src=x onerror=alert(1)>', srid: 4326,
    metadata: { data_description: '<script>bad</script>' }, geojson: { type: 'FeatureCollection', features: [{ type: 'Feature',
      properties: { Id: '<b>unsafe</b>' }, geometry: { type: 'LineString', coordinates: [[121, 24], [121.1, 24.1]] } }] } })
  const tooltip = globalThis.__formatTooltips.join('')
  assert.ok(!tooltip.includes('<img'))
  assert.ok(!tooltip.includes('<script>'))
  assert.ok(tooltip.includes('&lt;b&gt;unsafe&lt;/b&gt;'))
})

test('hiding an uncached layer never downloads its body', async () => {
  const definition = await component('src/views/ProjectDetail.vue')
  let requests = 0
  const context = instance(definition, { project: { projectId: 'a' }, layerVisibility: { b: true },
    $emit() {}, $nextTick: async () => {}, $refs: {}, $api: { get: async () => { requests++; return { success: true, data: {} } } } })
  await context.toggleGeojsonLayerVisibility('b')
  assert.equal(requests, 0)
})

test('turning a layer off during loading cannot make it reappear when the older request completes', async () => {
  const definition = await component('src/views/ProjectDetail.vue')
  let resolve, requests = 0
  const pending = new Promise(done => { resolve = done })
  const updates = []
  const context = instance(definition, { project: { projectId: 'a' }, layerVisibility: { b: false }, initAvailableFeatures: async () => {},
    $emit(_event, _project, id, visible) { this.layerVisibility[id] = visible }, $nextTick: async () => {},
    $refs: { projectMap: { updateLayerVisibility: (_id, visible) => updates.push(visible) } },
    $api: { get: async () => { requests++; return requests === 1 ? pending : { success: true, data: {} } } } })
  const first = context.toggleGeojsonLayerVisibility('b')
  await context.toggleGeojsonLayerVisibility('b')
  resolve({ success: true, data: { geojson: { features: [] } } })
  await first
  assert.equal(updates.at(-1), false)
  assert.equal(requests, 1)
})

test('closing a project clears map resources and ignores late vector responses', async t => {
  const definition = await component('src/views/ProjectDetail.vue')
  let resolve, cleared = 0, timerCleared = false
  t.mock.method(globalThis, 'clearInterval', () => { timerCleared = true })
  const context = instance(definition, { project: { projectId: 'a' }, animationTimer: 42, clearDisasterPointMarkers() {}, initAvailableFeatures: async () => {},
    $refs: { projectMap: { clearAllLayers() { cleared++ } } }, $api: { get: () => new Promise(done => { resolve = done }) } })
  const pending = context.loadSpecificGeoJSONLayer('b')
  definition.beforeUnmount.call(context)
  resolve({ success: true, data: { geojson: { features: [] } } })
  await pending
  assert.equal(cleared, 1)
  assert.equal(timerCleared, true)
  assert.deepEqual(context.loadedGeojsonLayers, {})
})

test('show-hide-show replaces an aborted download without accepting its stale response', async () => {
  const definition = await component('src/views/ProjectDetail.vue')
  const pending = [], configs = []
  const context = instance(definition, { project: { projectId: 'a' }, layerVisibility: { b: false }, initAvailableFeatures: async () => {},
    $emit(_event, _project, id, visible) { this.layerVisibility[id] = visible }, $nextTick: async () => {},
    $refs: { projectMap: { updateLayerVisibility() {} } },
    $api: { get: (_url, config) => { configs.push(config); return new Promise(done => pending.push(done)) } } })
  const first = context.toggleGeojsonLayerVisibility('b')
  await context.toggleGeojsonLayerVisibility('b')
  const third = context.toggleGeojsonLayerVisibility('b')
  assert.equal(pending.length, 2)
  assert.equal(configs[0].signal.aborted, true)
  assert.equal(configs[1].timeout, 0)
  pending[1]({ success: true, data: { file_id: 'new', geojson: { features: [] } } })
  await third
  pending[0]({ success: true, data: { file_id: 'old', geojson: { features: [] } } })
  await first
  assert.equal(context.loadedGeojsonLayers.b.file_id, 'new')
})

test('feature id zero supports attachment upload and image display', async () => {
  const definition = await component('src/views/ProjectDetail.vue')
  let submitted
  const context = instance(definition, { selectedFiles: [new Blob(['fixture'])], uploadForm: { upload_name: 'Photo', upload_description: '' },
    featureDisplayData: { featureId: 0, fileId: 'file', feature: { properties: { Id: 0 } } },
    featureUploads: { 0: [{ upload_id: 'photo' }] }, isImageFile: () => true,
    $api: { post: async (_url, form) => { submitted = form; return { success: true, data: {} } } },
    syncAllFeatureData: async () => {}, resetUploadForm() {}, showAlert() {} })
  assert.equal(definition.computed.imageUploads.call(context).length, 1)
  await context.handleFeatureUpload()
  assert.equal(submitted?.get('feature_id'), '0')
})

test('a delayed vector-layer callback cannot access a destroyed map', async t => {
  const definition = (await loadSource('src/components/project/ProjectMap.vue', {}, undefined, {
    leaflet: 'export default {Proj:{CRS:class{}},CRS:{},bounds:()=>({})}', proj4leaflet: 'export default {}'
  })).default
  let callback
  t.mock.method(globalThis, 'setTimeout', fn => { callback = fn })
  const context = instance(definition, { map: { hasLayer: () => false }, geojsonLayers: { a: { addTo() {}, options: {} } } })
  context.handleLayerVisibility('a', true)
  context.map = null
  assert.doesNotThrow(() => callback())
})
