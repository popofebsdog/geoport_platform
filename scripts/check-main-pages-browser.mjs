import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { writeArrayBuffer } = require('geotiff');
const raster = Buffer.from(await writeArrayBuffer(Array.from({ length: 256 }, (_, i) => i * 5 + 1), {
  width: 16, height: 16, ModelPixelScale: [0.25, 0.25, 0], ModelTiepoint: [0, 0, 0, 119, 26, 0],
  GTModelTypeGeoKey: 2, GTRasterTypeGeoKey: 1, GeographicTypeGeoKey: 4326
}));
const base = process.env.MONITORING_URL || 'http://127.0.0.1:5174';
const output = '/tmp/geoport-main-pages-check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER_PATH ? { executablePath: process.env.PLAYWRIGHT_BROWSER_PATH } : {}),
  args: ['--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessRestrictions'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Taipei' });
await context.addInitScript(() => { localStorage.setItem('authToken', 'operations-fixture-only'); localStorage.setItem('authUser', JSON.stringify({ username: 'fixture', role: 'admin' })); });
const p1 = '11111111-1111-4111-8111-111111111111', p2 = '22222222-2222-4222-8222-222222222222';
const r7 = '77777777-7777-4777-8777-777777777777', r8 = '88888888-8888-4888-8888-888888888888';
let parents = [{ project_id: p1, name: 'Alpha T7', description: null, road_type: 'highway', road_number: '台7線', latitude: 24.6, longitude: 121.4, is_bookmarked: true, earliest_start_date: '2026-02-02', latest_end_date: '2026-02-03', metadata: {} },
  { project_id: p2, name: 'Beta T8', description: '', road_type: 'highway', road_number: '台8線', latitude: 24.2, longitude: 121, is_bookmarked: false, earliest_start_date: '2026-01-01', latest_end_date: '2026-01-02', metadata: {} }];
const children = { [p1]: [{ project_id: '33333333-3333-4333-8333-333333333333', parent_project_id: p1, name: 'Survey', event_date: '2026-02-02', latitude: 24.6, longitude: 121.4 }] };
const links = {}, layers = [], writes = [], errors = [], checks = [];
const consoleMessages = [];
const users = [{ user_id: '99999999-9999-4999-8999-999999999999', username: 'fixture_admin',
  email: 'admin@example.org', display_name: 'Fixture admin', role: 'admin', is_active: true }];
let failParents = false;
await context.route('**/api/**', async route => {
  const request = route.request(), url = new URL(request.url()), path = decodeURIComponent(url.pathname.replace(/^\/api/, '')), method = request.method();
  const send = (data, success = true, status = 200) => route.fulfill({ status, json: { success, data } });
  if (method !== 'GET') writes.push({ method, path });
  // Every mutation is fulfilled here; nothing can reach a real backend.
  if (path === '/auth/login') return route.fulfill({ json: { success: true, token: 'operations-fixture-only', user: { username: 'fixture_admin', role: 'admin' } } });
  if (path === '/auth/users' && method === 'GET') return route.fulfill({ json: { success: true, users } });
  if (path === '/auth/users' && method === 'POST') {
    const { password, ...data } = request.postDataJSON();
    assert.ok(password.length >= 8);
    const user = { ...data, user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', is_active: true };
    users.push(user);
    return route.fulfill({ status: 201, json: { success: true, user } });
  }
  if (path.startsWith('/auth/users/') && method === 'PUT') {
    const user = users.find(item => item.user_id === path.split('/').at(-1));
    const { password, ...data } = request.postDataJSON();
    if (password) assert.ok(password.length >= 8);
    Object.assign(user, data);
    return route.fulfill({ json: { success: true, user } });
  }
  if (path === '/parent-projects' && method === 'GET') return failParents ? route.fulfill({ status: 503, json: { success: false } }) : send(parents);
  if (path === '/parent-projects' && method === 'POST') { const data = request.postDataJSON(); const item = { ...data, project_id: '44444444-4444-4444-8444-444444444444', latitude: data.locationGeometry?.coordinates?.[1], longitude: data.locationGeometry?.coordinates?.[0] }; parents.push(item); return send(item, true, 201); }
  const parentPath = path.match(/^\/parent-projects\/([^/]+)$/);
  if (parentPath && method === 'PUT') { Object.assign(parents.find(p => p.project_id === parentPath[1]), request.postDataJSON()); return send(parents.find(p => p.project_id === parentPath[1])); }
  if (parentPath && method === 'DELETE') { parents = parents.filter(p => p.project_id !== parentPath[1]); return send(null); }
  if (parentPath) return send(parents.find(p => p.project_id === parentPath[1]));
  const childPath = path.match(/^\/parent-projects\/([^/]+)\/children$/);
  if (childPath) return send({ parent: parents.find(p => p.project_id === childPath[1]), children: children[childPath[1]] || [] });
  const linkPath = path.match(/^\/parent-projects\/([^/]+)\/report-links(?:\/([^/]+))?$/);
  if (linkPath) {
    const id = linkPath[1]; links[id] ||= [];
    if (method === 'POST') { const item = { ...request.postDataJSON(), id: 'link-1' }; links[id].push(item); return send(item); }
    if (method === 'PUT') { const item = { ...request.postDataJSON(), id: linkPath[2] }; links[id] = [item]; return send(item); }
    if (method === 'DELETE') { links[id] = []; return send(null); }
    return send(links[id]);
  }
  if (path === '/warning-regions') return send([{ region_id: r7, region_code: '台7線', region_name: '臺7線復興工務段', is_active: true }, { region_id: r8, region_code: '台8臨37線', region_name: '臺8線臨37線', is_active: true }]);
  if (path.endsWith('/layers') && method === 'GET') return send(path.includes(r8) ? layers : []);
  if (path.endsWith('/layers') && method === 'POST') {
    const body = request.postData(); assert.ok(body.includes(r8)); assert.match(body, /hotspot/);
    const item = { layer_id: 'layer-test', layer_type: 'hotspot', layer_name: 'Synthetic hotspot', region_id: r8, storage_path: 'uploads/monitoring/fixture/hotspot.tif' }; layers.push(item); return send(item, true, 201);
  }
  if (path === '/warning-regions/layers/layer-test' && method === 'DELETE') { layers.length = 0; return send(null); }
  if (path === '/warning-regions/monitoring-file') return route.fulfill({ contentType: 'image/tiff', body: raster });
  if (path.endsWith('/alert-lights')) return send([]);
  if (path.endsWith('/point-colors')) return send([]);
  if (path.endsWith('/disaster-counts')) return send({});
  if (path.startsWith('/warning-regions/') && path.endsWith('/data')) {
    if (process.env.STRICT_CONSOLE === 'true') {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
      const data = {
        chart1: { dataStatus: 'ok', time_series: [{ time: `${today}-01-02-03`, type: 'TYPE IV', value: 1 }] },
        chart2: { dataStatus: 'ok', time_series: [{ datetime: `${today}T00:00:00`, hourly: 0, accumulated: 0 }] },
        chart3: { dataStatus: 'historical', sourceDate: '2025-12-19', pga: 4.2,
          parsed: { metadata: { stationCode: 'DH3A', startTime: '2025/12/19-04:23:28.20', sampleRate: 200 },
            timeSeries: Array.from({ length: 2400 }, (_, i) => ({ time: i / 200, absAcceleration: i === 1000 ? 4.2 : 0.1 })) } }
      }[url.searchParams.get('dataType')];
      return route.fulfill({ json: { success: true, source: 'external_api', data } });
    }
    return route.fulfill({ json: { success: false, source: 'external_api', data: { dataStatus: 'empty', time_series: [] } } });
  }
  if (path === '/projects/deleted') return send({ projects: [] });
  if (path === '/data/deleted') return send({ dataFiles: [] });
  if (path.startsWith('/reports')) return send({ reports: [] });
  if (method !== 'GET') throw new Error(`Unmodeled mutation blocked: ${method} ${path}`);
  return send([]);
});
await context.route('https://jatestrella.github.io/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Report fixture</h1>' }));
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => consoleMessages.push({ type: message.type(), text: message.text() }));
const countCards = count => page.waitForFunction(n => document.querySelectorAll('.parent-project-card').length === n, count);
const alertButton = label => page.locator('[class~="z-[99999]"]').getByRole('button', { name: label, exact: true });
const confirmAlert = async () => { await alertButton('確定').click(); };
try {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder('請輸入帳號或 Email').waitFor();
  assert.equal(await page.getByRole('button', { name: '註冊', exact: true }).count(), 0);
  assert.equal(await page.locator('input[autocomplete="new-password"]').count(), 0);
  await page.screenshot({ path: `${output}/login-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: `${output}/login-mobile.png`, fullPage: true });
  await page.getByPlaceholder('請輸入帳號或 Email').fill('fixture_admin');
  await page.getByPlaceholder('請輸入密碼').fill('browser-fixture-password');
  await page.getByRole('button', { name: '登入', exact: true }).click();
  await page.waitForURL(`${base}/`);
  checks.push('login without public registration on desktop/mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/users`);
  await page.getByText('fixture_admin', { exact: true }).waitFor();
  await page.getByRole('button', { name: '新增使用者', exact: true }).click();
  await page.getByPlaceholder('帳號', { exact: true }).fill('created_user');
  await page.getByPlaceholder('Email', { exact: true }).fill('created@example.org');
  await page.getByPlaceholder('顯示名稱（選填）', { exact: true }).fill('Created user');
  await page.getByPlaceholder('密碼（至少 8 字元）', { exact: true }).fill('browser-new-password');
  await page.screenshot({ path: `${output}/create-account-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const modal = page.locator('.fixed.inset-0.z-50 > form');
  const bounds = await modal.boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await page.screenshot({ path: `${output}/create-account-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: '建立帳號', exact: true }).click();
  await page.getByRole('heading', { name: '新增使用者', exact: true }).waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const createdUser = page.locator('tr').filter({ hasText: 'created_user' });
  await createdUser.waitFor();
  await createdUser.locator('select').selectOption('viewer');
  await createdUser.getByRole('button', { name: '啟用', exact: true }).click();
  await createdUser.getByRole('button', { name: '停用', exact: true }).waitFor();
  await createdUser.getByRole('button', { name: '重設密碼', exact: true }).click();
  assert.equal(await page.getByPlaceholder('帳號', { exact: true }).count(), 0);
  await page.getByPlaceholder('新密碼（至少 8 字元）', { exact: true }).fill('browser-reset-password');
  await page.getByRole('button', { name: '確認重設', exact: true }).click();
  await confirmAlert();
  checks.push('admin account creation, role change, disable and password reset');
  await page.goto(`${base}/disaster-collection`);
  await countCards(2);
  await page.getByTitle('展開搜尋', { exact: true }).click();
  await page.getByPlaceholder('搜尋專案名稱或描述...').fill(' Alpha ');
  await countCards(1);
  await page.getByRole('button', { name: '清除', exact: true }).click();
  await countCards(2);
  checks.push('search and clear');
  await page.getByRole('button', { name: /已標記/ }).click();
  await countCards(1);
  await page.getByRole('button', { name: /專案清單/ }).click();
  await countCards(2);
  checks.push('bookmark navigation');
  await page.getByTitle('地圖視圖', { exact: true }).click();
  await page.locator('.dc-workspace .leaflet-container').waitFor();
  assert.equal(await page.locator('.dc-list:visible').count(), 0, 'map and list must not be rendered together');
  await page.getByTitle('清單視圖', { exact: true }).click();
  await countCards(2);
  checks.push('map/list round trip');
  await page.getByRole('button', { name: '新增地點', exact: true }).click();
  await page.getByPlaceholder('例如：台7線 49.8K 復興區邊坡').fill('Fixture new place');
  await page.getByPlaceholder('24.675700').fill('24.2');
  await page.getByPlaceholder('121.408700').fill('121.1');
  await page.getByRole('button', { name: '創建地點專案', exact: true }).click();
  await page.getByRole('heading', { name: '新增地點專案', exact: true }).waitFor({ state: 'hidden' });
  await countCards(3);
  const created = page.locator('.parent-project-card').filter({ hasText: 'Fixture new place' });
  await created.getByTitle('編輯', { exact: true }).click();
  await page.getByPlaceholder('例如：台7線 49.8K 復興區邊坡').fill('Fixture edited place');
  await page.getByRole('button', { name: '更新專案資訊', exact: true }).click();
  await page.getByRole('heading', { name: '編輯地點專案', exact: true }).waitFor({ state: 'hidden' });
  await page.locator('.parent-project-card').filter({ hasText: 'Fixture edited place' }).waitFor();
  checks.push('create/edit place with intercepted API');
  await page.locator('.parent-project-card').filter({ hasText: 'Fixture edited place' }).getByTitle('刪除', { exact: true }).click();
  await alertButton('取消').click();
  await countCards(3);
  checks.push('cancel project delete');
  await page.getByRole('button', { name: /已刪除專案/ }).click();
  await page.getByRole('button', { name: /專案清單/ }).click();
  await countCards(3);
  await page.getByRole('button', { name: 'GeoPort 報告', exact: true }).click();
  await page.locator('iframe[title="GeoPort 報告"]').waitFor();
  await page.getByRole('button', { name: /專案清單/ }).click();
  checks.push('trash and reports round trip');
  await page.screenshot({ path: `${output}/collection-desktop.png`, fullPage: true });
  await page.getByTitle('回首頁').click();
  await page.goto(`${base}/early-warning`);
  await page.locator('.region-tab-btn').filter({ hasText: '臺8線臨37線' }).click();
  await page.getByTitle('熱點圖層', { exact: true }).click();
  await page.getByText('此區域尚未上傳熱點圖資，請至管理面板設定熱點圖層。', { exact: true }).waitFor();
  await confirmAlert();
  checks.push('region switch and missing hotspot');
  await page.getByRole('button', { name: /管理$/, exact: false }).first().click();
  const category = page.locator('.rounded-lg.border.overflow-hidden').filter({ hasText: '災點熱區' }).last();
  await category.getByRole('button', { name: '上傳', exact: true }).click();
  await category.locator('input[type="text"]').fill('Synthetic hotspot');
  await category.locator('input[type="file"]').setInputFiles({ name: 'fixture.tif', mimeType: 'image/tiff', buffer: raster });
  await category.getByRole('button', { name: '確認上傳', exact: true }).click();
  await confirmAlert();
  await category.getByText('Synthetic hotspot', { exact: true }).waitFor();
  await category.getByRole('button', { name: '移除', exact: true }).click();
  await alertButton('取消').click();
  assert.equal(writes.filter(w => w.path.includes('/layers/') && w.method === 'DELETE').length, 0);
  checks.push('hotspot upload binding and cancel removal');
  await page.getByRole('button', { name: '關閉地區資料管理', exact: true }).click();
  await page.getByTitle('熱點圖層', { exact: true }).click();
  if (process.env.STRICT_CONSOLE !== 'true') {
    await page.waitForFunction(() => Boolean(document.querySelector('.ew-root').__vueParentComponent.proxy.heatmapTiffLayer));
    await page.locator('.ew-root').evaluate(node => {
    const vm = node.__vueParentComponent.proxy;
    vm.$refs.projectMap.map.fitBounds(vm.heatmapTiffLayer.getBounds());
    });
  }
  await page.locator('.ew-map canvas.leaflet-tile').first().waitFor();
  checks.push('synthetic GeoTIFF rendering');
  if (process.env.STRICT_CONSOLE === 'true') {
    await page.locator('.region-tab-btn').filter({ hasText: '臺7線復興工務段' }).click();
    for (const selector of ['.microseismic-chart canvas', '.strong-motion-chart canvas']) {
      await page.locator(selector).waitFor();
      await page.waitForFunction(selector => {
        const canvas = document.querySelector(selector);
        if (!canvas?.width || !canvas?.height) return false;
        const copy = document.createElement('canvas');
        copy.width = canvas.width; copy.height = canvas.height;
        const context = copy.getContext('2d', { willReadFrequently: true });
        context.drawImage(canvas, 0, 0);
        return context.getImageData(0, 0, copy.width, copy.height).data.some((value, index) => index % 4 === 3 && value > 0);
      }, selector);
    }
    checks.push('production chart pixels');
  }
  await page.screenshot({ path: `${output}/warning-desktop.png`, fullPage: true });
  await page.goto(`${base}/disaster-collection`);
  await countCards(3);
  await page.setViewportSize({ width: 390, height: 844 });
  const cardBounds = await page.locator('.parent-project-card').first().boundingBox();
  assert.ok(cardBounds.x + cardBounds.width <= 390, 'collection cards must fit mobile');
  const titleBounds = await page.locator('.parent-project-card h3').first().boundingBox();
  assert.ok(titleBounds.width >= 80, 'project names must remain readable on mobile');
  await page.screenshot({ path: `${output}/collection-mobile.png`, fullPage: true });
  if (process.env.STRICT_CONSOLE === 'true') assert.deepEqual(consoleMessages, [], 'normal production flows must emit no console messages');
  failParents = true;
  await page.reload();
  await page.getByText('無法載入地點專案，請稍後重試', { exact: true }).waitFor();
  failParents = false;
  await page.getByRole('button', { name: '重試', exact: true }).click();
  await countCards(3);
  checks.push('load failure and retry');
  assert.deepEqual(errors, []);
  if (process.env.STRICT_CONSOLE === 'true') {
    assert.deepEqual(consoleMessages.filter(message => message.text !== 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)'), [], 'application and dependencies must emit no console messages');
  }
  console.log(JSON.stringify({ checks, writesIntercepted: writes, errors, consoleMessages, screenshots: output }));
} catch (error) {
  console.log(JSON.stringify({ checks, writes, errors, consoleMessages, failure: error.message }));
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await context.close();
  await browser.close();
}
