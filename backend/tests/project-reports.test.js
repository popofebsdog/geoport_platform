import { test, expect } from '@jest/globals';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

const reports = await import('../src/services/projectReportService.js').catch(() => ({}));
const render = (snapshot, format) => reports.renderProjectReport(snapshot, format, { mapRenderer: async () => null });
const snapshot = {
  kind: 'disaster', generatedAt: '2026-11-23T00:00:00.000Z',
  project: { id: '11111111-1111-4111-8111-111111111111', name: '邊坡調查測試專案', description: '現地調查紀錄',
    location: { longitude: 121.4, latitude: 24.6 }, status: 'active' },
  children: [], points: [{ id: 'p1', name: '測試災點', latitude: 24.61, longitude: 121.41 }],
  media: [], files: [], records: [], layers: [], charts: null,
  counts: { 災點: 1, 影像: 0, 檔案: 0 }, warnings: [], sources: ['GeoPort 專案資料庫']
};

test('project exports have a shared renderer for real PDF and editable DOCX', () => {
  expect(typeof reports.renderProjectReport).toBe('function');
});

test('PDF output embeds Chinese text and is a complete PDF, not renamed HTML', async () => {
  expect(typeof reports.renderProjectReport).toBe('function');
  const buffer = await render(snapshot, 'pdf');
  expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  expect(buffer.toString('latin1')).toContain('%%EOF');
  expect(buffer.length).toBeGreaterThan(10000);
});

test('Word output is a real OOXML package and unsupported formats fail closed', async () => {
  expect(typeof reports.renderProjectReport).toBe('function');
  const buffer = await render(snapshot, 'docx');
  expect(buffer.subarray(0, 2).toString()).toBe('PK');
  expect(buffer.length).toBeGreaterThan(3000);
  await expect(render(snapshot, 'html')).rejects.toMatchObject({ status: 400 });
});
test('standard empty report uses three content pages without footer-only pages', async () => {
  const bytes = await render({ ...snapshot, project: { ...snapshot.project, location: null }, points: [], counts: {} }, 'pdf');
  expect(bytes.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(3);
});
test('editable Word embeds the freely licensed Kai font with fixed 12pt text', async () => {
  const zip = await JSZip.loadAsync(await render(snapshot, 'docx'));
  expect(Object.keys(zip.files).some(file => /^word\/fonts\/.+\.odttf$/.test(file))).toBe(true);
  expect(await zip.file('word/styles.xml').async('string')).toContain('w:eastAsia="Iansui"');
  const styles = await zip.file('word/styles.xml').async('string');
  const styleIds = [...styles.matchAll(/w:styleId="([^"]+)"/g)].map(match => match[1]);
  expect(new Set(styleIds).size).toBe(styleIds.length);
  expect(await zip.file('word/document.xml').async('string')).toContain(snapshot.project.name);
  const xml = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'application/xml');
  const description = [...xml.getElementsByTagName('w:r')].find(run => run.getElementsByTagName('w:t')[0]?.textContent === snapshot.project.description);
  expect(description.getElementsByTagName('w:rFonts')[0]?.getAttribute('w:eastAsia')).toBe('Iansui');
  expect([...xml.getElementsByTagName('w:sz')].every(size => size.getAttribute('w:val') === '24')).toBe(true);
});
test('Word follows the fixed section order and places older full records only in its appendix', async () => {
  const records = Array.from({ length: 8 }, (_, index) => ({ id: `r${index}`, mileage: `地點${index}`, inspectionDate: `2026-11-${String(index + 1).padStart(2, '0')}`, details: { description: `原始內容${index}` } }));
  const zip = await JSZip.loadAsync(await render({ ...snapshot, kind: 'warning', records }, 'docx'));
  const xml = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'application/xml');
  const paragraphs = [...xml.getElementsByTagName('w:p')];
  const headings = paragraphs.filter(p => p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val') === 'Heading1').map(p => p.textContent);
  expect(headings).toEqual(['一、基本資訊', '二、事件與現況概要', '三、區位與圖資', '四、歷次調查紀錄', '五、監測資料彙整', '六、待確認事項與資料限制', '附錄、紀錄與附件索引']);
  const texts = paragraphs.map(p => p.textContent), appendix = texts.indexOf('附錄、紀錄與附件索引');
  expect(texts.findIndex(text => text.includes('地點0'))).toBeGreaterThan(appendix);
  expect(texts.findIndex(text => text.includes('地點7'))).toBeLessThan(appendix);
  expect(texts.join('')).toContain('監測資料彙整報告');
  expect(texts.join('')).toContain('本報告未進行致災機制');
});
test('Word indexes appendix photo evidence even when its image cannot be embedded', async () => {
  const media = Array.from({ length: 8 }, (_, index) => ({ id: `m${index}`, mimeType: 'image/jpeg', name: `照片${index}`, description: `照片登錄說明${index}` }));
  const zip = await JSZip.loadAsync(await render({ ...snapshot, media }, 'docx'));
  const xml = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'application/xml');
  expect(xml.documentElement.textContent).toContain('照片登錄說明5');
  expect(xml.documentElement.textContent).not.toContain('完整專案登錄說明');
});
test('Word interleaves each investigation with its owned figure before the next investigation', async () => {
  const children = [{ id: 'c1', name: '第一筆調查', description: '第一筆原文' }, { id: 'c2', name: '第二筆調查', description: '第二筆原文' }];
  const media = [{ id: 'm1', sourceProjectId: 'c1', name: '第一筆照片', mimeType: 'image/jpeg' }, { id: 'm2', sourceProjectId: 'c2', name: '第二筆照片', mimeType: 'image/jpeg' }];
  const zip = await JSZip.loadAsync(await render({ ...snapshot, children, media }, 'docx'));
  const xml = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'application/xml');
  const texts = [...xml.getElementsByTagName('w:p')].map(p => p.textContent);
  const main = texts.slice(0, texts.indexOf('附錄、紀錄與附件索引'));
  expect(main.findIndex(text => text.includes('圖 1 第一筆照片'))).toBeLessThan(main.indexOf('第二筆調查'));
  expect(main.findIndex(text => text.includes('第一筆原文'))).toBeLessThan(main.findIndex(text => text.includes('圖 1 第一筆照片')));
});
