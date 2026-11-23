import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { loadSource } from './load-source.js'

const panelPath = 'src/components/warning/ChartDataPanel.vue'
const axios = createRequire(import.meta.url)('axios')
const chartPath = name => `src/components/warning/charts/${name}.vue`
const waveform = () => ({
  dataStatus: 'historical', sourceDate: '2025-12-19',
  parsed: { metadata: { stationCode: 'DH3A', startTime: '2025/12/19-04:23:28.20', sampleRate: 200 },
    timeSeries: Array.from({ length: 1200 }, (_, i) => ({ time: i / 200, absAcceleration: i === 400 ? 4.2 : 0.1 })) }
})

function instance(component, props = {}) {
  const context = { ...component.data?.(), ...component.methods, ...props, $nextTick: async () => {} }
  for (const [key, get] of Object.entries(component.computed || {})) {
    Object.defineProperty(context, key, { get: () => get.call(context), configurable: true })
  }
  return context
}

test('missing, failed, unconfigured and historical measurements cannot be normal', async () => {
  const { default: panel } = await loadSource(panelPath)
  const context = instance(panel, { regionName: '臺7線復興工務段' })
  for (const data of [null, {}, { time_series: [] }, { time_series: [], hourly: 0, accumulated: 0 }, { dataStatus: 'error', time_series: [{ hourly: 0 }] },
    { dataStatus: 'not_configured' }, waveform()]) {
    for (const method of ['resolveRainfallStatus', 'resolveMicroseismicStatus', 'resolveStrongMotionStatus']) {
      assert.equal(context[method](data).level, 'unknown', `${method}: ${JSON.stringify(data).slice(0, 90)}`)
    }
  }
})

test('real zero rainfall remains normal but absent measurements show dashes', async () => {
  const { default: panel } = await loadSource(panelPath)
  const context = instance(panel)
  assert.equal(context.resolveRainfallStatus({ time_series: [{ hourly: 0, accumulated: 0 }] }).level, 'normal')
  assert.equal(context.rainfallMetrics[0].value, '-')
  assert.equal(context.strongMotionMetrics[0].value, '-')
  assert.equal(context.microseismicMetrics[0].value, '-')
})

test('TYPE IV is plotted and all received events are counted', async () => {
  const { default: micro } = await loadSource(chartPath('MicroseismicChart'))
  const { default: panel } = await loadSource(panelPath)
  const date = new Date().toISOString().slice(0, 10)
  const data = { time_series: ['TYPE I', 'TYPE IV', 'TYPE NOISE', 'TYPE EARTHQUAKE'].map(type => ({ time: `${date}-01-02-03`, type })) }
  const chart = instance(micro, { data, isDarkMode: false }).prepareChartData()
  assert.equal(chart.datasets.find(d => d.label === 'TYPE IV')?.data.length, 1)
  const context = instance(panel)
  context.chartData.chart1 = data
  assert.equal(context.microseismicMetrics[0].value, 4)
})

test('historical strong-motion keeps actual waveform and event date', async () => {
  const { default: motion } = await loadSource(chartPath('StrongMotionChart'))
  const context = instance(motion, { data: waveform(), isDarkMode: false })
  const chart = context.prepareChartData()
  assert.equal(Math.max(...chart.datasets[0].data), 4.2)
  assert.match(context.getChartTitle(), /2025\/12\/19/)
  assert.match(context.getChartTitle(), /歷史/)
})

test('waveform without sample rate still renders finite samples', async () => {
  const { default: motion } = await loadSource(chartPath('StrongMotionChart'))
  const data = waveform()
  delete data.parsed.metadata.sampleRate
  const chart = instance(motion, { data, isDarkMode: false }).prepareEventChartData()
  assert.ok(chart.datasets[0].data.length > 1)
  assert.ok(chart.labels.every(label => !label.includes('NaN')))
})

test('historical waveform also supports acceleration-only samples from the API contract', async () => {
  const { default: motion } = await loadSource(chartPath('StrongMotionChart'))
  const data = waveform()
  data.parsed.timeSeries = [{ time: 0, acceleration: -4.2 }]
  const chart = instance(motion, { data, isDarkMode: false }).prepareChartData()
  assert.equal(chart.datasets[0].data[0], 4.2)
})

function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

async function networkPanel(t) {
  const previous = globalThis.localStorage
  globalThis.localStorage = { getItem: () => null }
  t.after(() => { globalThis.localStorage = previous })
  const requests = []
  const previousAdapter = axios.defaults.adapter
  t.after(() => { axios.defaults.adapter = previousAdapter })
  axios.defaults.adapter = config => {
    const pending = deferred()
    requests.push({ config, pending })
    return pending.promise.then(data => ({ data, config, status: 200, headers: {} }))
  }
  const { default: panel } = await loadSource(panelPath)
  const context = instance(panel, { regionId: 'region-a', regionCode: '台7線', regionName: '臺7線復興工務段' })
  const finish = request => request.pending.resolve({ success: true, source: 'external_api', data: { time_series: [{ time: '01:00', hourly: 1, type: 'TYPE I' }] } })
  t.after(() => { context.clearAllData(); requests.forEach(finish) })
  return { context, requests, finish }
}

const tick = () => new Promise(resolve => setImmediate(resolve))

test('each chart displays immediately without waiting for the slow strong-motion API', async t => {
  const { context, requests, finish } = await networkPanel(t)
  const work = context.loadChartData()
  await tick()
  finish(requests.find(r => r.config.params.dataType === 'chart1'))
  await tick()
  const early = context.chartData.chart1
  const loading = { ...context.loading }
  requests.forEach(finish)
  await work
  assert.ok(early)
  assert.equal(loading.chart1, false)
  assert.equal(loading.chart3, true)
})

test('in-flight refresh from a previous region cannot overwrite new data', async t => {
  const { context, requests, finish } = await networkPanel(t)
  const work = context.loadSingleChartData('chart1')
  await tick()
  context.regionId = 'region-b'
  context.clearAllData()
  finish(requests[0])
  await work
  assert.equal(context.chartData.chart1, null)
})

test('an older same-region refresh cannot overwrite a newer response', async t => {
  const { context, requests } = await networkPanel(t)
  const first = context.loadSingleChartData('chart1')
  const second = context.loadSingleChartData('chart1')
  await tick()
  const response = value => ({ success: true, source: 'external_api', data: { values: [value] } })
  requests[1].pending.resolve(response(2))
  await second
  requests[0].pending.resolve(response(1))
  await first
  assert.deepEqual(context.chartData.chart1.values, [2])
})

test('API failure replaces any previous normal value and keeps automatic retry', async t => {
  const { context, requests } = await networkPanel(t)
  context.chartData.chart2 = { time_series: [{ hourly: 0, accumulated: 0 }] }
  const work = context.loadSingleChartData('chart2')
  await tick()
  requests[0].pending.resolve({ success: false, source: 'external_api', data: { dataStatus: 'empty', time_series: [] } })
  await work
  assert.equal(context.resolveRainfallStatus(context.chartData.chart2).level, 'unknown')
  assert.ok(context.refreshIntervals.chart2)
})

test('managed rainfall chart never duplicates parent request on mount', async () => {
  const { default: rain } = await loadSource(chartPath('RainfallChart'))
  let calls = 0
  const context = instance(rain, { managed: true, regionCode: '台7線', selectedDate: null,
    loadDataForDate() { calls++ }, markChartReady() {} })
  rain.mounted.call(context)
  assert.equal(calls, 0)
})

test('rainfall availability follows the same selected payload used for plotting', async () => {
  const { default: rain } = await loadSource(chartPath('RainfallChart'))
  const context = instance(rain, { data: { time_series: [{ hourly: 12 }] }, chartData: { dataStatus: 'empty', time_series: [] } })
  assert.equal(context.dataState.available, false)
})

test('page summary never reports system normal while enabled sensors are unavailable', async () => {
  const { default: page } = await loadSource('src/views/EarlyWarning.vue')
  const context = { selectedRegionCode: '台7線', alertLightSummary: { red: 0, yellow: 0 },
    monitorStatusSummary: [{ level: 'normal' }, { level: 'unknown' }, { level: 'unknown' }] }
  assert.equal(page.computed.overallRiskLevel.call(context), 'unknown')
  context.monitorStatusSummary = [{ level: 'normal' }, { level: 'normal' }, { level: 'unknown', enabled: false }]
  assert.equal(page.computed.overallRiskLevel.call(context), 'normal')
  context.alertLightSummary.red = 1
  assert.equal(page.computed.overallRiskLevel.call(context), 'high')
})

test('failed response cannot be accepted as healthy even with an inconsistent ok payload', async t => {
  const { context, requests } = await networkPanel(t)
  const work = context.loadSingleChartData('chart2')
  await tick()
  requests[0].pending.resolve({ success: false, source: 'external_api', data: { dataStatus: 'ok', time_series: [{ hourly: 0 }] } })
  await work
  assert.equal(context.resolveRainfallStatus(context.chartData.chart2).level, 'unknown')
})

test('source date is used instead of current fetch timestamp to detect old measurements', async () => {
  const { getMonitoringState } = await loadSource('src/utils/monitoringData.js')
  assert.equal(getMonitoringState({ sourceDate: '2025-12-19', timestamp: new Date().toISOString(), time_series: [{ hourly: 0 }] }).status, 'historical')
  for (const value of [null, '', undefined, 'bad', Infinity]) {
    assert.equal(getMonitoringState({ time_series: [{ hourly: value }] }).available, false)
  }
})

test('backend ok UTC observation is not downgraded by the Taiwan calendar date', async () => {
  const { getMonitoringState } = await loadSource('src/utils/monitoringData.js')
  assert.equal(getMonitoringState({ dataStatus: 'ok', sourceDate: '2025-12-19T23:59:00Z',
    time_series: [{ hourly: 0 }] }).status, 'ok')
})

test('missing individual strong-motion metrics are not invented as zero', async () => {
  const { default: panel } = await loadSource(panelPath)
  const context = instance(panel)
  context.chartData.chart3 = waveform()
  assert.equal(context.strongMotionMetrics.find(m => m.label === 'PGV').value, '-')
})
