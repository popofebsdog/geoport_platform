import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadSource } from './load-source.js'
import { createRequire } from 'node:module'

const alertStub = `const notify = async (message) => { globalThis.__operationAlerts.push(message); return globalThis.__operationConfirm !== false; }; export {notify as alert,notify as confirm,notify as success,notify as error};`
const stubs = {
  '@/utils/simpleAlertService': alertStub,
  '@/utils/simpleAlertService.js': alertStub,
  georaster: 'export default buffer => globalThis.__parseRaster(buffer);',
  'georaster-layer-for-leaflet': 'export default class { constructor(options) { this.options=options; } addTo(map) { map.addLayer(this); return this; } }'
}

test('monitoring manager reads by region id and uploads selected region id', async t => {
  browser(t)
  const axios=createRequire(import.meta.url)('axios'),previous=axios.defaults.adapter,previousStorage=globalThis.localStorage
  globalThis.localStorage={getItem:()=>null}
  t.after(()=>{axios.defaults.adapter=previous;globalThis.localStorage=previousStorage})
  let form
  axios.defaults.adapter=async config=>{form=config.data;return {data:{success:true},config,status:201,headers:{}}}
  const urls=[]
  t.mock.method(globalThis,'fetch',async url=>{urls.push(url);return {ok:true,json:async()=>({success:true,data:[]})}})
  const panel=(await loadSource('src/components/warning/RegionManagePanel.vue',{},undefined,stubs)).default
  const context=instance(panel,{regionId:'region-a',regionCode:'台8臨37線',$emit(){}})
  await context.fetchLayers()
  assert.match(urls[0],/\/id\/region-a\/layers$/)
  context.uploadForms.hotspot={layer_name:'hotspot',file:new Blob(['tiff'])}
  await context.uploadLayer('hotspot')
  assert.equal(form.get('region_id'),'region-a')
})

test('canceling monitoring layer removal never calls delete API', async t=>{
  browser(t)
  globalThis.__operationConfirm=false
  t.after(()=>{delete globalThis.__operationConfirm})
  const axios=createRequire(import.meta.url)('axios'),previous=axios.defaults.adapter
  let calls=0
  axios.defaults.adapter=async config=>{calls++;return {data:{success:true},config,status:200,headers:{}}}
  t.after(()=>{axios.defaults.adapter=previous})
  const panel=(await loadSource('src/components/warning/RegionManagePanel.vue',{},undefined,stubs)).default
  const context=instance(panel,{$emit(){},fetchLayers:async()=>{}})
  await context.deleteLayer({layer_id:'a',layer_name:'hotspot'})
  assert.equal(calls,0)
})

test('monitoring upload categories match supported API layer types and include hotspot', async()=>{
  const panel=(await loadSource('src/components/warning/RegionManagePanel.vue',{},undefined,stubs)).default
  const state=panel.data()
  assert.deepEqual(state.layerCategories.map(c=>c.key).sort(),['hotspot','insar','road','shapefile'])
  assert.ok(state.uploadForms.hotspot)
})

for (const name of ['CreateParentProjectModal','EditParentProjectModal','CreateChildProjectModal','EditChildProjectModal']) {
  test(`${name} closes after a successful save`, async t=>{
    browser(t)
    t.mock.method(console,'warn',()=>{})
    const axios=createRequire(import.meta.url)('axios'),previous=axios.defaults.adapter
    axios.defaults.adapter=async config=>({data:{success:true,data:{project_id:'saved'}},config,status:200,headers:{}})
    t.after(()=>{axios.defaults.adapter=previous})
    const modal=(await loadSource(`src/components/project/${name}.vue`,{},undefined,stubs)).default
    const events=[]
    const context=modal.setup({isVisible:true,parentProject:{project_id:'parent'},childProject:{project_id:'child'}},{emit:event=>events.push(event)})
    Object.assign(context.formData.value,{name:'Fixture',description:'Fixture description',latitude:24.2,longitude:121.1,event_date:'2026-11-22',event_time:'12:00'})
    assert.equal(context.isFormValid.value,true)
    await context.handleSubmit()
    assert.ok(events.includes('close'))
    assert.equal(context.isSubmitting.value,false)
  })
}

test('parent update reloads the actual project loader and closes its modal',async()=>{
  const context=instance(await component('DisasterCollection'),{showEditParentModal:true,selectedParentForEdit:{project_id:'a'}})
  let reloaded=0
  context.loadProjects=async()=>{reloaded++}
  await context.handleParentUpdated({project_id:'a'})
  assert.equal(reloaded,1)
  assert.equal(context.showEditParentModal,false)
})
async function component(name) { return (await loadSource(`src/views/${name}.vue`, {}, undefined, stubs)).default }
function instance(component, extra = {}) {
  const context = { ...component.data(), ...component.methods, $refs: {}, $nextTick: async () => {}, ...extra }
  for (const [key, get] of Object.entries(component.computed || {})) Object.defineProperty(context, key, { get: () => get.call(context) })
  return context
}
function pending() { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const tick = () => new Promise(resolve => setImmediate(resolve))
function browser(t) {
  const previous = { window: globalThis.window, localStorage: globalThis.localStorage, __operationAlerts: globalThis.__operationAlerts, __parseRaster: globalThis.__parseRaster }
  globalThis.window = { location: { origin: 'http://localhost:5174', pathname: '/early-warning' } }
  globalThis.localStorage = { getItem: () => null }
  globalThis.__operationAlerts = []
  globalThis.__parseRaster = async () => ({ projection: 3826 })
  t.after(() => Object.assign(globalThis, previous))
}

test('collection search tolerates optional null values and trims whitespace', async () => {
  const context = instance(await component('DisasterCollection'), { searchQuery: '  T7  ', projects: [{name:null,description:null},{name:'T7',description:null}],
    parentProjects: [{project_id:'p1',name:null},{project_id:'p2',name:'T7'}], reports:[{title:null,description:null},{title:'T7',description:null}] })
  assert.equal(context.filteredProjects.length, 1)
  assert.equal(context.filteredParentProjects.length, 1)
  assert.equal(context.filteredReports.length, 1)
})

test('parent list applies date range and bookmark filters to actual displayed rows', async () => {
  const context = instance(await component('DisasterCollection'), { filterStartDate:'2026-02-01', filterEndDate:'2026-02-28', showBookmarkedOnly:true,
    parentProjects:[{project_id:'a',name:'a',earliest_start_date:'2026-02-02',latest_end_date:'2026-02-03'},
      {project_id:'b',name:'b',earliest_start_date:'2026-01-01',latest_end_date:'2026-01-02'},
      {project_id:'c',name:'c',earliest_start_date:null,latest_end_date:null}],
    projects:[{projectId:'a',isBookmarked:true},{projectId:'b',isBookmarked:true}] })
  assert.deepEqual(context.filteredParentProjects.map(p=>p.project_id), ['a'])
})

test('map uses the same parent filters as the collection list', async () => {
  const context = instance(await component('DisasterCollection'), { searchQuery:'Alpha', parentProjects:[{project_id:'a',name:'Alpha',latitude:24,longitude:121},{project_id:'b',name:'Beta',latitude:24,longitude:121}],
    childProjectsMap:{a:[{project_id:'a1'}],b:[{project_id:'b1'}]} })
  assert.deepEqual(context.getAllChildProjectsForMap().map(c=>c.project_id), ['a1'])
})

test('date filter uses event dates when child projects do not have legacy start/end dates',async()=>{
  const context=instance(await component('DisasterCollection'),{filterStartDate:'2026-02-01',filterEndDate:'2026-02-28',
    parentProjects:[{project_id:'a',name:'A',earliest_start_date:null,latest_end_date:null},{project_id:'b',name:'B',earliest_start_date:null,latest_end_date:null}],
    childProjectsMap:{a:[{event_date:'2026-02-02T12:00:00'}],b:[{event_date:'2026-01-01T12:00:00'}]}})
  assert.deepEqual(context.filteredParentProjects.map(p=>p.project_id),['a'])
})

test('project load failure clears stale data and never substitutes sample projects', async () => {
  const context = instance(await component('DisasterCollection'), { parentProjects:[{project_id:'old'}], projects:[{projectId:'old'}],childProjectsMap:{old:[{}]},
    $api:{get:async()=>{throw new Error('offline')}} })
  await context.loadProjects()
  assert.deepEqual(context.projects, [])
  assert.deepEqual(context.parentProjects, [])
  assert.deepEqual(context.childProjectsMap, {})
  assert.ok(context.projectLoadError)
})

test('failed bookmark does not change local state', async t => {
  browser(t)
  const context = instance(await component('DisasterCollection'), { $api:{projectAPI:{toggleBookmark:async()=>({success:false,message:'failed'})}} })
  const project={projectId:'a',name:'A',isBookmarked:false}
  await context.toggleBookmark(project)
  assert.equal(project.isBookmarked, false)
})

test('successful bookmark follows server state and synchronizes displayed project', async t => {
  browser(t)
  const context = instance(await component('DisasterCollection'), {projects:[{projectId:'a',isBookmarked:false}],parentProjects:[{project_id:'a',is_bookmarked:false}],
    $api:{projectAPI:{toggleBookmark:async()=>({success:true,data:{isBookmarked:false}})}} })
  const project={projectId:'a',name:'A',isBookmarked:true}
  await context.toggleBookmark(project)
  assert.equal(project.isBookmarked, false)
  assert.equal(context.projects[0].isBookmarked, false)
})

test('closing report modal before response cannot update another project or throw', async () => {
  const response=pending()
  const context=instance(await component('DisasterCollection'), {reportLinkTargetProject:{project_id:'a'},$api:{get:()=>response.promise}})
  const work=context.fetchReportLinks()
  context.closeReportLinkModal()
  response.resolve({success:true,data:[{id:1,title:'old'}]})
  await work
  assert.deepEqual(context.reportLinkList, [])
})

test('monitoring layers prefer region id instead of combining same-code projects', async t => {
  browser(t)
  const urls=[]
  t.mock.method(globalThis,'fetch',async url=>{urls.push(url);return {ok:true,json:async()=>({success:true,data:[]})}})
  const context=instance(await component('EarlyWarning'),{selectedRegionId:'region-a'})
  await context.fetchMonitoringLayers('台8臨37線')
  assert.match(urls[0], /\/id\/region-a\/layers$/)
})

test('older layer responses cannot overwrite current selected region', async t => {
  browser(t)
  const first=pending(),second=pending()
  t.mock.method(globalThis,'fetch',url=>String(url).includes('first')?first.promise:second.promise)
  const context=instance(await component('EarlyWarning'))
  const a=context.fetchMonitoringLayers('first')
  const b=context.fetchMonitoringLayers('second')
  second.resolve({ok:true,json:async()=>({success:true,data:[{layer_type:'road',storage_path:'second.geojson'}]})})
  await b
  first.resolve({ok:true,json:async()=>({success:true,data:[{layer_type:'hotspot',storage_path:'first.tif'}]})})
  await a
  assert.equal(context.monitoringLayers.road?.storage_path,'second.geojson')
  assert.equal(context.monitoringLayers.hotspot,undefined)
})

test('same-code regions use the selected project work section for road filtering',async t=>{
  browser(t)
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({features:['A','B'].map(section=>({properties:{公路編:'台8線',工務段:section},geometry:{coordinates:[121,24]}}))})}))
  const context=instance(await component('EarlyWarning'),{selectedRegionId:'b',selectedRegionCode:'台8線',
    regions:[{region_id:'a',region_code:'台8線',description:'工務段：A'},{region_id:'b',region_code:'台8線',description:'工務段：B'}],
    monitoringLayers:{road:{fileUrl:'/road'}},$refs:{projectMap:{map:{}}},loadPointColors:async()=>{},loadAlertLights:async()=>{},loadDisasterCounts:async()=>{},
    renderRoadGeoJSON:async()=>{},renderDisasterHeatmapMarkers(){},fitMapToRoadData(){}})
  await context.updateMapForRegion('台8線',true)
  assert.deepEqual(context.currentRoadGeoJSON.features.map(f=>f.properties.工務段),['B'])
})

test('failed layer response removes previous region layers', async t => {
  browser(t)
  t.mock.method(globalThis,'fetch',async()=>({ok:false,json:async()=>({success:false})}))
  const context=instance(await component('EarlyWarning'),{monitoringLayers:{hotspot:{storage_path:'old.tif'}}})
  await context.fetchMonitoringLayers('new')
  assert.deepEqual(context.monitoringLayers,{})
})

test('turning hotspot off while downloading never adds a late layer', async t => {
  browser(t)
  const bytes=pending(),layers=new Set()
  t.mock.method(globalThis,'fetch',async()=>({ok:true,arrayBuffer:()=>bytes.promise}))
  const map={addLayer:layer=>layers.add(layer),hasLayer:layer=>layers.has(layer),removeLayer:layer=>layers.delete(layer)}
  const context=instance(await component('EarlyWarning'),{heatmapToolAvailable:true,monitoringLayers:{hotspot:{fileUrl:'/hot.tif'}},$refs:{projectMap:{map}}})
  const loading=context.toggleDisasterHeatmap()
  await tick()
  await context.toggleDisasterHeatmap()
  bytes.resolve(new ArrayBuffer(8))
  await loading
  assert.equal(context.showDisasterHeatmap,false)
  assert.equal(layers.size,0)
})

test('hotspot without uploaded file reports missing configuration and stays off', async t => {
  browser(t)
  const context=instance(await component('EarlyWarning'),{heatmapToolAvailable:true,$refs:{projectMap:{map:{}}}})
  await context.toggleDisasterHeatmap()
  assert.equal(context.showDisasterHeatmap,false)
  assert.equal(context.isLoadingHeatmap,false)
  assert.match(globalThis.__operationAlerts[0],/尚未.*熱點/)
})

test('page cleanup is registered as a Vue lifecycle hook', async t => {
  browser(t)
  const page=await component('EarlyWarning')
  assert.equal(typeof page.beforeUnmount,'function')
})

test('removing the active hotspot via manager also removes it from the map',async t=>{
  browser(t)
  const layer={},removed=[]
  const map={hasLayer:()=>true,removeLayer:item=>removed.push(item)}
  const context=instance(await component('EarlyWarning'),{selectedRegionId:'a',selectedRegionCode:'台8線',showDisasterHeatmap:true,heatmapTiffLayer:layer,
    $refs:{projectMap:{map}},fetchMonitoringLayers:async function(){this.monitoringLayers={}},updateMapForRegion:async()=>{}})
  await context.onLayersUpdated()
  assert.equal(context.showDisasterHeatmap,false)
  assert.equal(context.heatmapTiffLayer,null)
  assert.deepEqual(removed,[layer])
})

for(const method of ['loadPointColors','loadDisasterCounts','loadAlertLights']) {
  test(`${method} ignores an older region response`,async t=>{
    browser(t)
    const first=pending(),second=pending()
    const context=instance(await component('EarlyWarning'),{$api:{get:url=>url.includes('first')?first.promise:second.promise},
      clearAlertLightMarkers(){this.currentAlertLights=[]},createAlertLightMarker:async()=>{}})
    const a=context[method]('first'),b=context[method]('second')
    const payload=method==='loadDisasterCounts'?{current:2}:[{latitude:24,longitude:121,point_color:'yellow',name:'current'}]
    second.resolve({success:true,data:payload});await b
    first.resolve({success:true,data:method==='loadDisasterCounts'?{old:1}:[{latitude:24,longitude:121,point_color:'red',name:'old'}]});await a
    if(method==='loadPointColors')assert.equal(context.pointColorMap['121.0000000,24.0000000'],'yellow')
    if(method==='loadDisasterCounts')assert.deepEqual(context.disasterCountMap,{current:2})
    if(method==='loadAlertLights')assert.equal(context.currentAlertLights[0].name,'current')
  })
}
