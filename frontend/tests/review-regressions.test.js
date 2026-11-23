import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadSource } from './load-source.js'
import { readFile } from 'node:fs/promises'
import { reactive, markRaw, isProxy } from 'vue'

test('child project popup treats project names and descriptions as text', async () => {
  let popup
  globalThis.__reviewMarker = {
    addTo() { return this },
    bindPopup(html) { popup = html; return this }
  }
  try {
    const { default: component } = await loadSource('src/components/project/ProjectMap.vue', {}, undefined, {
      leaflet: 'export default {Proj:{CRS:class{}},CRS:{EPSG4326:{}},bounds(){},divIcon(){},marker:()=>globalThis.__reviewMarker};',
      proj4leaflet: 'export default {};'
    })
    component.methods.createChildProjectMarker.call({
      map: {}, childMarkers: [], activeChildProjectId: null
    }, { name: '<img src=x onerror=alert(1)>', description: '<script>unsafe</script>' }, 24, 121)
    assert.ok(!popup.includes('<img'))
    assert.ok(!popup.includes('<script>'))
    assert.ok(popup.includes('&lt;img'))
    assert.ok(popup.includes('&lt;script&gt;'))
  } finally {
    delete globalThis.__reviewMarker
  }
})

test('the active child marker also escapes project names and descriptions', async t => {
  let popup
  globalThis.__reviewMarker = { addTo() { return this }, bindPopup(html) { popup = html; return this } }
  t.after(() => { delete globalThis.__reviewMarker })
  const { default: component } = await loadSource('src/components/project/ProjectMap.vue', {}, undefined, {
    leaflet: 'export default {Proj:{CRS:class{}},CRS:{EPSG4326:{}},bounds(){},marker:()=>globalThis.__reviewMarker};',
    proj4leaflet: 'export default {};'
  })
  component.methods.addProjectMarker.call({ map: {}, isParentProject: () => false,
    project: { name: '<img src=x onerror=alert(1)>', description: '<script>unsafe</script>', location: { lat: 24, lng: 121 } } })
  assert.ok(!popup.includes('<img'))
  assert.ok(!popup.includes('<script>'))
  assert.ok(popup.includes('&lt;img'))
})

test('association uploads load the selected hidden layer without showing it on the map', async () => {
  const { default: component } = await loadSource('src/views/ProjectDetail.vue')
  const requests = []
  const layer = { file_id: 'survey', metadata: { data_type: 'profile_observation' } }
  const state = reactive({ ...component.data(), ...component.methods, project: { projectId: 'project-a' },
    layerVisibility: { survey: false }, availableFeatures: [{ id: 'old' }],
    showAlert() {},
    $api: { get: async url => {
      requests.push(url)
      return url.includes('/geojson?') ? { success: true, data: { ...layer, geojson: { features: [{ id: 0, properties: null }] } } }
        : { success: true, data: [] }
    } } })
  await state.associateData(layer)
  assert.deepEqual(state.availableFeatures.map(feature => feature.id), [0])
  assert.equal(state.layerVisibility.survey, false)
  assert.ok(requests.includes('/data/project/project-a/geojson?fileId=survey'))
  assert.ok(requests.includes('/data/feature/survey/0'))
  assert.equal(state.geojsonRequests.size, 0)
})

test('a shared layer request returns data to association and map callers', async () => {
  const { default: component } = await loadSource('src/views/ProjectDetail.vue')
  let resolve, requests = 0
  const result = new Promise(done => { resolve = done })
  const state = reactive({ ...component.data(), ...component.methods, project: { projectId: 'project-a' },
    initAvailableFeatures: async () => {}, $api: { get: () => { requests++; return result } } })
  const association = state.loadSpecificGeoJSONLayer('survey', { activate: false })
  const map = state.loadSpecificGeoJSONLayer('survey')
  resolve({ success: true, data: { file_id: 'survey', geojson: { features: [] } } })
  const results = await Promise.all([association, map])
  assert.equal(requests, 1)
  assert.ok(results.every(data => data?.file_id === 'survey'))
  assert.equal(state.geojsonRequests.size, 0)
})

test('login contains no public registration controls or handler', async () => {
  const source = await readFile(new URL('../src/views/Login.vue', import.meta.url), 'utf8')
  const { default: component } = await loadSource('src/views/Login.vue')
  assert.equal(component.methods.handleRegister, undefined)
  assert.doesNotMatch(source, /regForm|activeTab|註冊/)
  const { authAPI } = await loadSource('src/services/api.js')
  assert.equal(authAPI.register, undefined)
})

test('account creation and password reset both require the backend minimum of eight characters', async t => {
  let writes = 0
  globalThis.__accountWrite = async () => { writes++ }
  t.after(() => { delete globalThis.__accountWrite })
  const { default: component } = await loadSource('src/views/UserManagement.vue', {}, undefined, {
    '@/services/api.js': 'export const authAPI={createUser:()=>globalThis.__accountWrite(),updateUser:()=>globalThis.__accountWrite()};',
    '@/utils/simpleAlertService': 'export const alert=async()=>{},success=async()=>{},error=async()=>{};'
  })
  const state = { ...component.data(), ...component.methods, fetchUsers: async () => {} }
  state.addForm = { username: 'fixture', email: 'fixture@example.org', password: 'short77' }
  await state.createUser()
  assert.equal(writes, 0)
  assert.match(state.addError, /8/)
  state.resetPasswordTarget = { user_id: 'fixture' }
  state.resetPwdValue = 'short77'
  await state.submitResetPassword()
  assert.equal(writes, 0)
})

test('management opens a parent in the shared project presentation', async () => {
  const navigations = []
  globalThis.__reviewRouter = { push: target => navigations.push(target) }
  try {
    const { default: component } = await loadSource('src/views/ProjectManagement.vue', {}, undefined, {
      vue: 'export const reactive=value=>value;export const ref=value=>({value});export const computed=get=>({get value(){return get()}});export const inject=(_key,fallback)=>fallback;export const onMounted=()=>{};',
      'vue-router': 'export const useRouter=()=>globalThis.__reviewRouter;'
    })
    const state = component.setup()
    assert.equal(typeof state.handleOpenParent, 'function')
    state.handleOpenParent({ project_id: 'parent-a' })
    assert.deepEqual(navigations[0], { path: '/disaster-collection', query: { project: 'parent-a' } })
    const source = await readFile(new URL('../src/views/ProjectManagement.vue', import.meta.url), 'utf8')
    assert.match(source, /@open="handleOpenParent"/)
    assert.match(source, /@add-report-link="handleManageReportLinks"/)
  } finally { delete globalThis.__reviewRouter }
})

test('admin rows use compiled components rather than runtime string templates', async () => {
  const { default: component } = await loadSource('src/views/AdminDashboard.vue')
  for (const name of ['HealthRow', 'StorageRow']) {
    assert.equal(component.components[name].template, undefined)
    assert.equal(typeof component.components[name].render, 'function')
  }
})

test('failed admin health refresh replaces an earlier healthy status', async () => {
  const { default: component } = await loadSource('src/views/AdminDashboard.vue', {}, undefined, {
    '@/services/api.js': 'export const adminAPI={getHealth:async()=>{throw new Error("offline")}};'
  })
  const state = { health: { status: 'ok' }, healthLoading: false, error: '' }
  await component.methods.fetchHealth.call(state)
  assert.equal(state.health.status, 'error')
  assert.equal(state.healthLoading, false)
})

test('mileage layers stay outside Vue reactivity before being added to Leaflet', async t => {
  const previous = globalThis.fetch
  const browser = { window: globalThis.window, localStorage: globalThis.localStorage }
  globalThis.window = { location: { origin: 'http://localhost' } }
  globalThis.localStorage = { getItem: () => 'fixture-token' }
  t.after(() => { globalThis.fetch = previous; Object.assign(globalThis, browser); delete globalThis.__reviewMileageLayer })
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [] }) })
  let addedAsProxy
  globalThis.__reviewMileageLayer = { addTo() { addedAsProxy = isProxy(this); return this } }
  const { default: component } = await loadSource('src/views/ProjectDetail.vue', {}, undefined, {
    leaflet: 'export default {geoJSON:()=>globalThis.__reviewMileageLayer};'
  })
  const state = reactive({ map: markRaw({ hasLayer: () => false }), mileagePointsLayer: null,
    highwayMileageVisible: true, updateMileageLabel() {} })
  await component.methods.loadMileagePoints.call(state)
  assert.equal(addedAsProxy, false)
  assert.equal(isProxy(state.mileagePointsLayer), false)
})

test('map teardown delegates cleanup to Leaflet without resetting zoom before removal', async () => {
  const { default: component } = await loadSource('src/components/project/ProjectMap.vue', {}, undefined, {
    leaflet: 'export default {Proj:{CRS:class{}},CRS:{EPSG4326:{}},bounds(){}};',
    proj4leaflet: 'export default {};'
  })
  const calls = []
  const map = Object.fromEntries(['stop', 'off', 'eachLayer', 'remove'].map(name => [name, () => calls.push(name)]))
  const state = { map, clearWarningLightMarkers() {}, clearChildMarkers() {} }
  component.beforeUnmount.call(state)
  assert.deepEqual(calls, ['remove'])
  assert.equal(state.map, null)
})
