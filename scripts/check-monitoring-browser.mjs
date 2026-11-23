import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const baseUrl = process.env.MONITORING_URL || 'http://127.0.0.1:5174';
const output = process.env.MONITORING_SCREENSHOTS || '/tmp/geoport-monitoring-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER_PATH ? { executablePath: process.env.PLAYWRIGHT_BROWSER_PATH } : {}),
  args: ['--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessRestrictions']
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Taipei' });
const errors = [];
context.on('page', page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});
const markup = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{height:auto!important;overflow:visible!important}body{margin:0}#check{height:950px;max-width:850px;margin:auto;padding:8px;box-sizing:border-box}@media(max-width:600px){#check{height:1150px}}</style></head>
<body><div id="check"></div><script type="module">
import {createApp,ref} from '/node_modules/.vite/deps/vue.js';
import Panel from '/src/components/warning/ChartDataPanel.vue';
import '/src/assets/styles/main.css';
const dark=ref(false);window.setDark=value=>{dark.value=value;};
window.panel=createApp(Panel,{regionCode:'台7線',regionId:'ba5883f5-2332-43a4-a474-5656cbf62760',regionName:'臺7線復興工務段'})
  .provide('isDarkMode',dark).mount('#check');
</script></body></html>`;
await context.route('**/__monitoring_check', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: markup }));
const waitForIdle = page => page.waitForFunction(() => window.panel && Object.values(window.panel.loading).every(value => !value));
const state = (data, success = true) => ({ success, source: 'external_api', data });
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
const micro = { dataStatus: 'ok', time_series: ['TYPE I', 'TYPE IV', 'TYPE NOISE'].map(type => ({ time: `${today}-01-02-03`, type, value: 1 })) };
const motion = { dataStatus: 'historical', sourceDate: '2025-12-19', pga: 4.2,
  parsed: { metadata: { stationCode: 'DH3A', startTime: '2025/12/19-04:23:28.20', sampleRate: 200 },
    timeSeries: Array.from({ length: 2400 }, (_, i) => ({ time: i / 200, absAcceleration: i === 1000 ? 4.2 : 0.1 })) } };

async function inspectCanvases(page) {
  const canvases = await page.locator('canvas').evaluateAll(nodes => nodes.map(canvas => {
    const { width, height } = canvas;
    const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    let painted = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) painted++;
    return { width, height, painted };
  }));
  assert.equal(canvases.length, 2);
  assert.ok(canvases.every(canvas => canvas.width > 200 && canvas.height > 50 && canvas.painted > 1000));
  return canvases;
}

try {
  const page = await context.newPage();
  let releaseMotion;
  const motionGate = new Promise(resolve => { releaseMotion = resolve; });
  let phase = 'initial';
  const counts = { chart1: 0, chart2: 0, chart3: 0 };
  await page.route('**/api/warning-regions/**/data?*', async route => {
    const type = new URL(route.request().url()).searchParams.get('dataType');
    counts[type]++;
    let response;
    if (type === 'chart1') response = phase === 'initial' ? state(micro) : state({ dataStatus: 'error' }, false);
    if (type === 'chart2') response = phase === 'initial'
      ? state({ dataStatus: 'empty', time_series: [], hourly: null }, false)
      : state({ dataStatus: 'ok', time_series: [{ datetime: `${today}T00:00:00`, hourly: 0, accumulated: 0 }] });
    if (type === 'chart3') { if (phase === 'initial') await motionGate; response = state(motion); }
    await route.fulfill({ json: response });
  });
  await page.goto(`${baseUrl}/__monitoring_check`);
  await page.locator('.microseismic-chart canvas').waitFor();
  assert.equal(await page.evaluate(() => window.panel.loading.chart3), true);
  assert.match(await page.locator('.rainfall-chart').innerText(), /無資料/);
  assert.doesNotMatch(await page.locator('.rainfall-chart').innerText(), /目前無雨量/);
  releaseMotion();
  await waitForIdle(page);
  await page.locator('.strong-motion-chart canvas').waitFor();
  await page.waitForTimeout(500);
  assert.deepEqual(counts, { chart1: 1, chart2: 1, chart3: 1 });
  assert.match(await page.locator('.strong-motion-chart').innerText(), /歷史.*2025\/12\/19/);
  assert.match(await page.locator('.command-status').innerText(), /強地動 歷史資料/);
  assert.equal(await page.evaluate(() => window.panel.microseismicMetrics[0].value), 3);
  const desktopPixels = await inspectCanvases(page);
  await page.screenshot({ path: `${output}/desktop.png`, fullPage: true });
  await page.evaluate(() => window.setDark(true));
  await page.waitForTimeout(500);
  await inspectCanvases(page);
  await page.screenshot({ path: `${output}/dark.png`, fullPage: true });
  await page.evaluate(() => window.setDark(false));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const mobilePixels = await inspectCanvases(page);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.locator('.command-grid').evaluate(node => getComputedStyle(node).overflowY), 'auto');
  await page.locator('.command-grid').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await page.screenshot({ path: `${output}/mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.waitForTimeout(300);
  await inspectCanvases(page);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: `${output}/mobile-320.png`, fullPage: true });
  phase = 'refresh';
  await page.evaluate(() => window.panel.refresh());
  await page.locator('.rainfall-chart .chart-empty-state').waitFor();
  assert.match(await page.locator('.rainfall-chart').innerText(), /目前無雨量/);
  assert.match(await page.locator('.microseismic-chart').innerText(), /來源連線失敗/);
  assert.deepEqual(counts, { chart1: 2, chart2: 2, chart3: 2 });
  await page.waitForTimeout(500);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ scenarios: ['independent loading', 'missing vs real zero', 'historical waveform', 'TYPE IV', 'refresh', 'theme switch', 'desktop/mobile pixels'], counts, desktopPixels, mobilePixels, screenshots: output }));

  if (process.env.MONITORING_LIVE === '1') {
    const live = await context.newPage();
    await live.goto(`${baseUrl}/__monitoring_check`);
    await waitForIdle(live);
    await live.waitForTimeout(700);
    const statuses = await live.locator('.command-status').innerText();
    const payloads = await live.evaluate(() => Object.fromEntries(Object.entries(window.panel.chartData).map(([key, data]) => [key,
      { status: data?.dataStatus, sourceDate: data?.sourceDate, count: data?.time_series?.length, pga: data?.pga }])));
    assert.deepEqual(errors, []);
    await live.screenshot({ path: `${output}/live.png`, fullPage: true });
    console.log(JSON.stringify({ live: true, statuses, payloads }));

    // Only the public monitoring endpoints are exercised; no account or database changes.
    await context.addInitScript(() => {
      localStorage.setItem('authToken', 'monitoring-readonly-browser-test');
      localStorage.setItem('authUser', JSON.stringify({ username: 'monitoring-test', role: 'viewer' }));
    });
    const app = await context.newPage();
    await app.goto(`${baseUrl}/early-warning`);
    await app.locator('.strong-motion-chart canvas').waitFor();
    assert.match(await app.locator('.risk-copy').innerText(), /監測資料待確認/);
    await app.screenshot({ path: `${output}/full-page.png`, fullPage: true });
    await app.setViewportSize({ width: 390, height: 844 });
    await app.waitForTimeout(500);
    const bounds = await app.locator('.ew-chart-rail').boundingBox();
    assert.ok(bounds.x + bounds.width <= 390, 'monitoring rail must fit the mobile viewport');
    assert.equal(await app.locator('.ew-root').evaluate(node => getComputedStyle(node).overflowY), 'auto');
    await app.locator('.strong-motion-chart canvas').scrollIntoViewIfNeeded();
    const plotHeight = await app.locator('.monitor-card').last().locator('.trend-board').evaluate(node => node.clientHeight);
    assert.ok(plotHeight >= 200, 'the mobile waveform must not be clipped by its card');
    const cardHeight = await app.locator('.monitor-card').last().evaluate(node => node.clientHeight);
    assert.ok(cardHeight >= 400, 'the mobile card must leave room for metrics, event date and waveform');
    await app.screenshot({ path: `${output}/full-page-mobile.png`, fullPage: true });
    await app.setViewportSize({ width: 320, height: 844 });
    await app.waitForTimeout(300);
    const narrowBounds = await app.locator('.ew-chart-rail').boundingBox();
    assert.ok(narrowBounds.x + narrowBounds.width <= 320);
    console.log(JSON.stringify({ fullPage: true, risk: await app.locator('.risk-copy').innerText(), mobileRail: bounds }));
  }
} finally {
  await context.close();
  await browser.close();
}
