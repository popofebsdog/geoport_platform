import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const fixture = JSON.parse(await fs.readFile(process.env.PUBLICATION_QA_OUTPUT || '/tmp/geoport-publication-qa.json', 'utf8'));
const base = process.env.PUBLICATION_URL || 'http://127.0.0.1:5178';
const output = `${fixture.root}/browser`; await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_BROWSER_PATH });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Taipei' });
await context.addInitScript(({ token, user }) => { localStorage.setItem('authToken', token); localStorage.setItem('authUser', JSON.stringify(user)); }, fixture);
const page = await context.newPage(), errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.accept());
let guestContext;
try {
  await page.goto(`${base}/disaster-collection`);
  const card = page.locator('.parent-project-card').filter({ hasText: '邊坡調查驗證專案' }).last();
  await card.getByRole('button', { name: '分享唯讀連結', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '專案唯讀分享' });
  await dialog.getByRole('button', { name: '建立連結', exact: true }).click();
  const input = dialog.getByRole('textbox', { name: '唯讀分享網址' });
  await input.waitFor(); const sharedUrl = await input.inputValue();
  assert.match(sharedUrl, /\/shared-project#[A-Za-z0-9_-]{43}$/);
  await page.screenshot({ path: `${output}/share-desktop.png`, fullPage: true });
  checks.push('created share from collection');
  guestContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Taipei' });
  const guest = await guestContext.newPage(); guest.on('pageerror', error => errors.push(error.message));
  await guest.goto(sharedUrl);
  await guest.getByRole('heading', { name: '邊坡調查驗證專案', exact: true }).waitFor();
  assert.equal(await guest.locator('nav').count(), 0);
  assert.equal(await guest.getByRole('button', { name: '分享唯讀連結' }).count(), 0);
  await guest.locator('.leaflet-container').waitFor();
  await guest.screenshot({ path: `${output}/guest-desktop.png`, fullPage: true });
  for (const width of [390, 320]) {
    await guest.setViewportSize({ width, height: 844 });
    assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await guest.screenshot({ path: `${output}/guest-${width}.png`, fullPage: true });
  }
  checks.push('guest has no login or admin UI and fits desktop/mobile');
  await dialog.locator('.publication-share-list li').first().getByRole('button', { name: '撤銷分享' }).click();
  await dialog.getByText('分享已撤銷', { exact: true }).waitFor();
  await guest.getByRole('button', { name: '重新整理', exact: true }).click();
  await guest.getByRole('heading', { name: '分享連結已失效或無法讀取' }).waitFor();
  checks.push('revocation denies a new guest read');
  await dialog.getByRole('button', { name: '關閉', exact: true }).click();
  await card.getByRole('button', { name: '產出專案報告', exact: true }).click();
  const report = page.getByRole('dialog', { name: '專案報告', exact: true });
  await report.getByRole('heading', { name: '三、區位與圖資', exact: true }).waitFor();
  for (const [label, format] of [['下載 PDF', 'pdf'], ['下載 Word', 'docx']]) {
    const download = page.waitForEvent('download'); await report.getByRole('button', { name: label, exact: true }).click();
    await (await download).saveAs(`${output}/ui-report.${format}`);
  }
  await page.screenshot({ path: `${output}/report-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${output}/report-mobile.png`, fullPage: true });
  assert.equal(await report.evaluate(node => node.getBoundingClientRect().right > innerWidth), false);
  await report.getByRole('button', { name: '關閉', exact: true }).click();
  await card.getByRole('button', { name: '分享唯讀連結' }).click();
  await page.screenshot({ path: `${output}/share-mobile.png`, fullPage: true });
  await page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }).click();
  checks.push('PDF and Word downloads through UI');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/early-warning`);
  await page.locator('.region-tab-btn').filter({ hasText: '預警唯讀驗證專案' }).last().click();
  await page.getByRole('button', { name: '分享唯讀連結', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '建立連結', exact: true }).click();
  const warningUrl = await page.getByRole('textbox', { name: '唯讀分享網址' }).inputValue();
  await guest.goto(warningUrl);
  await guest.getByRole('heading', { name: '預警唯讀驗證專案', exact: true }).waitFor();
  assert.equal(await guest.locator('.publication-chart').count(), 3);
  await guest.screenshot({ path: `${output}/warning-guest-mobile.png`, fullPage: true });
  checks.push('warning share and monitoring view');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors, output }));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  console.log(JSON.stringify({ checks, errors, output, failure: error.message })); throw error;
} finally { await guestContext?.close(); await context.close(); await browser.close(); }
