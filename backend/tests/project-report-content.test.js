import { test, expect } from '@jest/globals';

const content = await import('../src/services/projectReportContent.js').catch(() => ({}));
const empty = {
  kind: 'disaster', generatedAt: '2026-11-23T00:00:00.000Z',
  project: { id: '11111111-1111-4111-8111-111111111111', name: '測試專案' },
  children: [], points: [], records: [], media: [], files: [], layers: [], charts: null,
  counts: { 災點: 0, 影像: 0, 檔案: 0 }, warnings: [], sources: ['GeoPort 專案資料庫']
};
const build = snapshot => content.buildReportContent(snapshot);

test('report content has a versioned six-section contract, including empty sections', () => {
  expect(typeof content.buildReportContent).toBe('function');
  const report = build(empty);
  expect(report.specVersion).toBe('1.0');
  expect(report.title).toBe('災情資料彙整報告');
  expect(report.sections.map(section => section.id)).toEqual(['basic', 'overview', 'location', 'surveys', 'monitoring', 'limitations']);
  expect(report.sections.every(section => section.title && section.paragraphs.length)).toBe(true);
  expect(report.appendix.title).toContain('紀錄與附件索引');
});
test('no records do not become no disaster, normal safety, or a cause assessment', () => {
  const report = build(empty);
  const overview = report.sections.find(section => section.id === 'overview').paragraphs.join('');
  expect(overview).toContain('系統尚無災點紀錄');
  expect(overview).not.toMatch(/未發生災害|表示現地安全|目前正常|降雨導致/);
  expect(report.sections.at(-1).paragraphs.join('')).toContain('未進行致災機制、邊坡穩定性或現地安全性評估');
});
test('uploaded images never acquire invented capture times or a change trend', () => {
  const report = build({ ...empty, media: [{ id: 'm1', name: '照片.jpg', collection: 'media', mimeType: 'image/jpeg',
    takenAt: null, uploadedAt: '2026-11-22T01:00:00Z', createdAt: '2026-11-22T01:00:00Z' }] });
  expect(report.photos[0].caption).toContain('拍攝時間：未提供');
  expect(report.photos[0].caption).toContain('上傳時間：2026/11/22');
  expect(report.sections[0].fields.find(field => field.label === '資料所載日期範圍').value).toBe('未提供');
  expect(report.sections.at(-1).paragraphs.join('')).toContain('不據以判定災前災後變化');
});
test('project start dates and record upload dates are not substituted for event or inspection dates', () => {
  const report = build({ ...empty, project: { ...empty.project, startDate: '2026-01-01' },
    children: [{ id: 'c1', name: '未註日期調查', startDate: '2026-10-10' }],
    records: [{ id: 'r1', mileage: '1K', inspectionDate: null, registeredAt: '2026-11-22T00:00:00Z', time: null }] });
  expect(report.sections[0].fields.find(field => field.label === '事件時間').value).toContain('未確認');
  const records = report.appendix.records;
  expect(records.find(record => record.id === 'c1').fields.find(field => field.label === '登錄事件日期').value).toBe('未提供');
  expect(records.find(record => record.id === 'r1').fields.find(field => field.label === '巡查日期').value).toBe('未提供');
});
test('main body holds five recent dated records in order while appendix retains the source list', () => {
  const records = Array.from({ length: 8 }, (_, index) => ({ id: `r${index}`, mileage: `地點${index}`,
    inspectionDate: `2026-11-${String(index + 1).padStart(2, '0')}`, details: { description: `原始紀錄${index}` } }));
  const report = build({ ...empty, kind: 'warning', records, counts: { 巡查紀錄: 8, 告警燈號: 0 } });
  expect(report.title).toBe('監測資料彙整報告');
  expect(report.sections.find(section => section.id === 'surveys').entries.map(entry => entry.id)).toEqual(['r3', 'r4', 'r5', 'r6', 'r7']);
  expect(report.appendix.records).toHaveLength(8);
  expect(report.sections[0].fields.find(field => field.label === '資料所載日期範圍').value).toBe('2026/11/01 至 2026/11/08');
});
test('historical and missing monitoring have specific caveats, source times and classification limits', () => {
  const report = build({ ...empty, kind: 'warning', charts: {
    chart1: { dataStatus: 'historical', observedAt: '2025-12-01T00:00:00Z', time_series: [{ time: '2025-12-01T00:00:00Z', type: 'TYPE ROCKFALL' }] },
    chart2: { dataStatus: 'empty', time_series: [] }, chart3: { dataStatus: 'error', time_series: [] }
  } });
  const charts = report.sections.find(section => section.id === 'monitoring').charts;
  expect(charts[0].paragraphs.join('')).toContain('尚待人工確認');
  expect(charts[0].paragraphs.join('')).toContain('不能代表目前現況');
  expect(charts[0].fields.find(field => field.label === '最近觀測時間').value).toContain('2025/12/01');
  expect(charts[1].paragraphs.join('')).toContain('不能據以判定無災害或數值為零');
  expect(charts[2].paragraphs.join('')).toContain('來源連線失敗');
});
test('large source limits are disclosed before appendices and never labelled complete exports', () => {
  const report = build({ ...empty, warnings: ['巡查紀錄共 266 筆，本次列出前 200 筆'] });
  expect(report.sections.at(-1).paragraphs).toContain('巡查紀錄共 266 筆，本次列出前 200 筆');
  expect(report.appendix.note).toContain('本次擷取');
  expect(report.appendix.note).not.toContain('全數資料已匯出');
});
test('report dates are Taiwan time, preserve date-only values, and never turn null into epoch', () => {
  expect(typeof content.formatReportDate).toBe('function');
  expect(content.formatReportDate('2026-11-22T18:00:00Z')).toContain('2026/11/23');
  expect(content.formatReportDate('2026-11-22')).toBe('2026/11/22');
  expect(content.formatReportDate(null)).toBe('未提供');
  expect(content.formatReportDate('2026-11-22T18:00:00Z')).not.toMatch(/[\u2000-\u200f\u202f]/);
});
test('abridged report content does not promise the unabridged source in its appendix', () => {
  const report = build({ ...empty, project: { ...empty.project, description: '長'.repeat(10001) },
    children: [{ id: 'c1', name: '調查', description: '長'.repeat(2001) }] });
  expect(JSON.stringify(report)).not.toMatch(/完整內容見附錄|完整登錄文字/);
  expect(report.appendix.note).toContain('原始紀錄');
});
test('monitoring period uses normalized observation instants before naive display strings', () => {
  const report = build({ ...empty, kind: 'warning', charts: { chart2: { dataStatus: 'historical', time_series: [
    { datetime: '2026-11-22 01:00:00', observedAt: '2026-11-22T01:00:00Z' },
    { datetime: '2026-11-22 02:00:00', observedAt: '2026-11-22T02:00:00Z' }
  ] } } });
  const rainfall = report.sections.find(section => section.id === 'monitoring').charts.find(chart => chart.key === 'chart2');
  expect(rainfall.fields.find(field => field.label === '可辨識觀測日期範圍').value.replace(/\s/g, ' ')).toBe('2026/11/22 09:00 至 2026/11/22 10:00');
});
test('appendix media use the same evidence caption and description as report photos', () => {
  const report = build({ ...empty, media: Array.from({ length: 8 }, (_, index) => ({ id: `m${index}`, mimeType: 'image/jpeg', name: `照片${index}`, description: `登錄說明${index}` })) });
  expect(report.photos).toHaveLength(4);
  expect(report.appendix.media[5]).toMatchObject({ caption: report.appendix.photos[5].caption, description: '登錄說明5' });
});
test('main photos cover different source records and are attached only by actual project ownership', () => {
  const children = Array.from({ length: 4 }, (_, index) => ({ id: `c${index}`, name: `調查${index}`, eventDate: `2026-11-0${index + 1}`, description: `調查說明${index}` }));
  const media = Array.from({ length: 8 }, (_, index) => ({ id: `m${index}`, sourceProjectId: `c${Math.floor(index / 2)}`, name: `照片${index}`, mimeType: 'image/jpeg' }));
  const report = build({ ...empty, children, media });
  const entries = report.sections.find(section => section.id === 'surveys').entries;
  expect(entries.map(entry => entry.photos.map(photo => photo.id))).toEqual([['m0'], ['m2'], ['m4'], ['m6']]);
  expect(report.photos.map(photo => photo.id)).toEqual(['m0', 'm2', 'm4', 'm6']);
  expect(report.embeddedPhotos).toHaveLength(8);
  expect(report.appendix.records.map(entry => entry.photos.map(photo => photo.id))).toEqual([['m1'], ['m3'], ['m5'], ['m7']]);
  expect(report.sections.find(section => section.id === 'surveys').photos).toEqual([]);
});
test('unassociated photos remain standalone rather than being paired by a filename or date', () => {
  const report = build({ ...empty, children: [{ id: 'c1', name: '調查照片', eventDate: '2026-11-01' }], media: [
    { id: 'm1', name: '調查照片2026-11-01.jpg', sourceProjectId: empty.project.id, mimeType: 'image/jpeg' }
  ] });
  const surveys = report.sections.find(section => section.id === 'surveys');
  expect(surveys.entries[0].photos).toEqual([]);
  expect(surveys.photos.map(photo => photo.id)).toEqual(['m1']);
});
test('photos owned by appendix-only investigations never fill unrelated main-body slots', () => {
  const children = Array.from({ length: 6 }, (_, index) => ({ id: `c${index}`, name: `調查${index}`, eventDate: `2026-11-0${index + 1}` }));
  const media = [{ id: 'm0', sourceProjectId: 'c0', name: '最早調查照片', mimeType: 'image/jpeg' }];
  const report = build({ ...empty, children, media });
  expect(report.photos).toEqual([]);
  expect(report.sections.find(section => section.id === 'surveys').photos).toEqual([]);
  expect(report.appendix.records.find(entry => entry.id === 'c0').photos.map(photo => photo.id)).toEqual(['m0']);
});
