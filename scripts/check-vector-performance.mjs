import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.MONITORING_URL || 'http://127.0.0.1:5174';
const output = '/tmp/geoport-data-format-check';
await mkdir(output, { recursive: true });
const fixture = process.env.VECTOR_FIXTURE || 'backend/uploads/data/geojson/file-1759201059953-777328175.geojson';
const text = await readFile(fixture, 'utf8');
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER_PATH ? { executablePath: process.env.PLAYWRIGHT_BROWSER_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.stack || error.message));
await context.route('**/api/**', route => route.fulfill({ json: { success: true, data: [] } }));
await context.route('**/__vector-fixture', route => route.fulfill({ contentType: 'application/geo+json', body: text }));
await context.route('**/__vector-check', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>
<style>html,body,#app{margin:0;width:100%;height:100%}</style></head><body><div id="app"></div><script type="module">
import { createApp } from '/node_modules/.vite/deps/vue.js';
import ProjectMap from '/src/components/project/ProjectMap.vue';
import '/src/assets/styles/main.css';
import '/node_modules/leaflet/dist/leaflet.css';
window.mapApp=createApp(ProjectMap,{project:{projectId:'fixture',name:'Vector fixture',location:{lat:24.8,lng:121.2}},layerVisibility:{fixture:true},onFeatureClick:event=>{window.lastFeatureClick=event;},onKmlLoadingError:event=>{window.lastKmlError=event;}});
window.vm=window.mapApp.mount('#app');
</script></body></html>` }));
try {
  await page.goto(`${base}/__vector-check`);
  await page.waitForFunction(() => window.vm?.map?.getSize().x > 0);
  const measure = await page.evaluate(async () => {
    const vm = window.vm;
    const t0 = performance.now(), response = await fetch('/__vector-fixture'), source = await response.text();
    const t1 = performance.now(), geojson = JSON.parse(source), t2 = performance.now();
    // Only benchmark the user vector layer, not external basemap network variability.
    Object.values(vm.layers).forEach(layer => { if (layer && vm.map.hasLayer(layer)) vm.map.removeLayer(layer); });
    const longTasks = [];
    const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e => e.duration)));
    observer.observe({ type: 'longtask', buffered: false });
    const start = performance.now();
    vm.addGeojsonLayerToMap('fixture', { file_name: 'Existing vector fixture', srid: 4326, geojson, metadata: { layer_color: '#1e7c54' } });
    const buildMs = performance.now() - start;
    const layer = vm.geojsonLayers.fixture;
    const bounds = layer.getBounds();
    vm.map.fitBounds(bounds, { animate: false });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const renderMs = performance.now() - start;
    const pans = [];
    for (let n = 0; n < 6; n++) {
      const t = performance.now(); vm.map.panBy([n % 2 ? -60 : 60, 0], { animate: false });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      pans.push(performance.now() - t);
    }
    observer.disconnect();
    const canvas = document.querySelector('.leaflet-overlay-pane canvas');
    let paintedPixels = 0;
    if(canvas) { const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data; for(let i=3;i<pixels.length;i+=4) if(pixels[i]) paintedPixels++; }
    return { bytes: source.length, features: geojson.features.length, transferMs: t1 - t0, parseMs: t2 - t1,
      buildMs, renderMs, panMedianMs: [...pans].sort((a,b)=>a-b)[3], pans,
      svgPaths: document.querySelectorAll('.leaflet-overlay-pane path').length,
      canvases: document.querySelectorAll('.leaflet-overlay-pane canvas').length, longTasks,
      featureLayers: layer.getLayers().length, boundsValid: bounds.isValid(), paintedPixels };
  });
  assert.equal(measure.featureLayers, measure.features);
  assert.equal(measure.boundsValid, true);
  assert.equal(measure.canvases, 1);
  assert.ok(measure.paintedPixels > 1000, 'desktop vector canvas must contain visible data');
  assert.ok(measure.renderMs < 2000, 'local large-vector render budget');
  assert.ok(measure.panMedianMs < 250, 'local large-vector pan budget');
  const mode = process.env.VECTOR_LABEL || 'current';
  await page.screenshot({ path: `${output}/vector-${mode}-desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { window.vm.map.invalidateSize(); window.vm.map.fitBounds(window.vm.geojsonLayers.fixture.getBounds(), { animate: false }); });
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  await page.screenshot({ path: `${output}/vector-${mode}-mobile.png` });
  const click = await page.evaluate(() => {
    const vm=window.vm, line=vm.geojsonLayers.fixture.getLayers()[0], points=line.getLatLngs();
    const point=vm.map.latLngToContainerPoint(points[Math.floor(points.length/2)]), rect=vm.map.getContainer().getBoundingClientRect();
    return { x:rect.x+point.x, y:rect.y+point.y };
  });
  await page.mouse.click(click.x,click.y);
  await page.waitForFunction(()=>window.lastFeatureClick?.fileId==='fixture');
  const formatChecks = await page.evaluate(() => {
    const vm = window.vm;
    vm.map.removeLayer(vm.geojsonLayers.fixture);
    const kml = '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Style id="custom"><LineStyle><color>ffaa7700</color><width>4</width></LineStyle></Style><Placemark id="survey-7"><name>Survey</name><styleUrl>#custom</styleUrl><ExtendedData><Data name="risk"><value>7</value></Data></ExtendedData><MultiGeometry><Point><coordinates>121.2,24.8,10</coordinates></Point><LineString><coordinates>121.2,24.8 121.21,24.81</coordinates></LineString></MultiGeometry></Placemark></Document></kml>';
    vm.addGeojsonLayerToMap('kml-format', { file_name: 'KML fixture', file_type: 'kml', kml, metadata: {} });
    const features = vm.geojsonLayers['kml-format'].toGeoJSON().features;
    vm.addGeojsonLayerToMap('kml-no-id',{file_name:'No-id fixture',file_type:'kml',metadata:{},kml:'<kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><Point><coordinates>121,24</coordinates></Point></Placemark><Placemark><Point><coordinates>121.1,24.1</coordinates></Point></Placemark></kml>'});
    const fallbackIds = vm.geojsonLayers['kml-no-id'].getLayers().map(layer => {
      layer.fire('click',{latlng:{lat:24,lng:121}});
      return window.lastFeatureClick.featureId;
    });
    const collection = {type:'FeatureCollection',features:[{type:'Feature',properties:null,geometry:{type:'GeometryCollection',geometries:[{type:'Point',coordinates:[250000,2700000,8]}]}}]};
    vm.addGeojsonLayerToMap('twd-format',{file_name:'TWD97 fixture',srid:3826,geojson:collection,metadata:{}});
    const projected = vm.geojsonLayers['twd-format'].toGeoJSON().features[0].geometry.geometries[0].coordinates;
    vm.addGeojsonLayerToMap('bad-kml',{file_type:'kml',file_name:'Invalid fixture',kml:'<kml><broken>'});
    vm.updateLayerVisibility('kml-format', false);
    const hidden = !vm.map.hasLayer(vm.geojsonLayers['kml-format']);
    vm.updateLayerVisibility('kml-format',true);
    return { kmlFeatureCount: features.length, kmlId: features[0]?.id, risk: features[0]?.properties?.risk,
      projected, originalPosition:collection.features[0].geometry.geometries[0].coordinates,
      invalidKmlReported:!!window.lastKmlError, hidden, restored:vm.map.hasLayer(vm.geojsonLayers['kml-format']),
      fallbackIds };
  });
  assert.equal(formatChecks.kmlFeatureCount, 1, 'KML MultiGeometry must preserve a single feature and its attributes');
  assert.equal(formatChecks.kmlId, 'survey-7');
  assert.equal(String(formatChecks.risk), '7');
  assert.deepEqual(formatChecks.fallbackIds,[0,1]);
  assert.ok(formatChecks.projected[0]>120 && formatChecks.projected[0]<122);
  assert.ok(formatChecks.projected[1]>23 && formatChecks.projected[1]<26);
  assert.equal(formatChecks.projected[2],8);
  assert.deepEqual(formatChecks.originalPosition,[250000,2700000,8]);
  assert.ok(formatChecks.invalidKmlReported && formatChecks.hidden && formatChecks.restored);
  await page.evaluate(async()=>{
    const {createApp}=await import('/node_modules/.vite/deps/vue.js');
    const {default:Modal}=await import('/src/components/temporal/TemporalDataUploadModal.vue');
    window.mapApp.unmount();
    window.modalApp=createApp(Modal,{isVisible:true,projectId:'fixture'});
    window.modalVm=window.modalApp.mount('#app');
  });
  await page.locator('select').first().selectOption('csv');
  await page.locator('input[type=file]').setInputFiles({name:'survey.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFFstep,note,value\r\n0,"line one\nline ""two""",0\r\n1,plain,2.5\r\n')});
  await page.waitForFunction(()=>!window.modalVm.isParsingFile && window.modalVm.previewData.length===2);
  const csvPreview=await page.evaluate(()=>({columns:[...window.modalVm.previewColumns],rows:window.modalVm.previewData.map(row=>({...row}))}));
  assert.deepEqual(csvPreview.columns,['step','note','value']);
  assert.equal(csvPreview.rows[0].note,'line one\nline "two"');
  assert.equal(csvPreview.rows[0].value,'0');
  const mobileForm = await page.locator('form').boundingBox();
  assert.ok(mobileForm.width >= 280, 'mobile CSV form must not be squeezed into a half-width column');
  await page.screenshot({path:`${output}/csv-mobile.png`});
  await page.getByRole('button',{name:'選擇軸線',exact:true}).click();
  await page.getByRole('columnheader',{name:'step',exact:true}).click();
  await page.getByRole('button',{name:'保存X軸',exact:true}).click();
  await page.getByRole('columnheader',{name:'value',exact:true}).click();
  await page.getByRole('button',{name:'保存Y軸',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>[...window.modalVm.chartConfig.xAxisColumns]),['step']);
  assert.deepEqual(await page.evaluate(()=>[...window.modalVm.chartConfig.yAxisColumns]),['value']);
  await page.screenshot({path:`${output}/csv-preview-mobile.png`});
  await page.setViewportSize({width:320,height:740});
  assert.ok((await page.locator('form').boundingBox()).width>=220);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=320));
  await page.screenshot({path:`${output}/csv-preview-320.png`});
  await page.setViewportSize({width:1280,height:900});
  await page.screenshot({path:`${output}/csv-desktop.png`});
  assert.deepEqual(errors, []);
  const result = { mode, fixture, ...measure, formatChecks, csvPreview, errors };
  await writeFile(`${output}/vector-${mode}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
