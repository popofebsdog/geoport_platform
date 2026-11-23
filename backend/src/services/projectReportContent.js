export const REPORT_SPEC_VERSION = '1.0';
const MAIN_RECORD_LIMIT = 5;
const text = value => typeof value === 'string' && value.trim() ? value.trim() : '';
const field = (label, value) => ({ label, value: value || '未提供' });

function instant(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
  }
  const normalized = value.replace(/^(\d{4}-\d{2}-\d{2})-(\d{2})-(\d{2})-(\d{2})$/, '$1T$2:$3:$4Z');
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)) return null;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : null;
}

export function formatReportDate(value) {
  const time = instant(value);
  if (time === null) return '未提供';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replaceAll('-', '/');
  return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(time)).replace(/\s/g, ' ');
}

const excerpt = value => value.length > 240 ? `${value.slice(0, 240)}...（節錄，續見附錄或原始紀錄）` : value;
const ordered = entries => [...entries].sort((a, b) => (instant(a.date) ?? Infinity) - (instant(b.date) ?? Infinity));
function period(values) {
  const dated = values.map(value => ({ value, time: instant(value) })).filter(item => item.time !== null).sort((a, b) => a.time - b.time);
  if (!dated.length) return '未提供';
  const first = formatReportDate(dated[0].value), last = formatReportDate(dated.at(-1).value);
  return first === last ? first : `${first} 至 ${last}`;
}

export function inspectionText(value, depth = 0) {
  if (value === null || value === undefined || value === '') return '未提供';
  if (depth > 4) return '內容略，請查閱原始紀錄';
  if (typeof value !== 'object') return String(value);
  const labels = { description: '登錄說明', roadSection: '路線', eventName: '事件名稱', mileage: '里程', value: '登錄數值' };
  return Object.entries(value).map(([key, child]) => `${labels[key] || key}：${inspectionText(child, depth + 1)}`).join('；') || '未提供';
}

function investigationEntries(snapshot) {
  const children = (snapshot.children || []).map(child => ({ id: child.id, sourceProjectId: child.id, title: text(child.name) || '未命名調查紀錄',
    date: child.eventDate || null, text: text(child.description) || '尚無登錄說明。',
    fields: [field('登錄事件日期', formatReportDate(child.eventDate)), field('資料依據', `調查子專案 ${child.id}`)] }));
  const inspections = (snapshot.records || []).map(record => {
    const date = Object.hasOwn(record, 'inspectionDate') ? record.inspectionDate : record.time;
    return { id: record.id, title: `${record.mileage || '未填里程'} ${record.type === 'special' ? '特別巡查' : '例行巡查'}`,
      date: date || null, text: inspectionText(record.details),
      fields: [field('巡查日期', formatReportDate(date)), field('登錄時間', formatReportDate(record.registeredAt)), field('資料依據', `巡查紀錄 ${record.id}`)] };
  });
  return ordered([...children, ...inspections]);
}

function photoEntries(snapshot) {
  return (snapshot.media || []).filter(media => /^image\/(png|jpeg|webp)$/.test(media.mimeType)).map(media => ({
    id: media.id, name: media.name || '未命名照片', sourceProjectId: media.sourceProjectId,
    captureLabel: formatReportDate(media.takenAt), uploadLabel: formatReportDate(media.uploadedAt || media.createdAt),
    description: text(media.description)
  }));
}

const monitoringStates = {
  ok: ['資料可用', '本次取得可用觀測資料；資料可用不代表現地安全。'],
  historical: ['歷史資料', '本節為歷史觀測，不能代表目前現況。'],
  empty: ['未取得可用觀測', '本次未取得可用觀測資料，不能據以判定無災害或數值為零。'],
  not_configured: ['尚未設定資料來源', '本專案尚未設定此項監測資料來源，無法判定其監測現況。'],
  error: ['來源連線失敗', '本次來源連線失敗，尚無法確認最新觀測。']
};

function monitoringEntries(snapshot) {
  if (!snapshot.charts) return [];
  return [['chart1', '微地動'], ['chart2', '雨量'], ['chart3', '強地動']].map(([key, label]) => {
    const data = snapshot.charts[key] || {}, rows = data.time_series || [];
    const [status, note] = monitoringStates[data.dataStatus] || ['狀態未確認', '此項資料狀態未確認，不據以判定現地狀態。'];
    const observed = instant(data.observedAt) !== null ? data.observedAt : data.sourceDate;
    return { key, title: label, status, paragraphs: [note,
      ...(key === 'chart1' ? ['事件類型為系統辨識結果，尚待人工確認；分類筆數不等於已確認災害次數。'] : [])],
      fields: [field('資料來源', `${label}服務`), field('最近觀測時間', formatReportDate(observed)),
        field('可辨識觀測日期範圍', period(rows.map(row => row.observedAt || row.datetime || (typeof row.time === 'string' ? row.time : null)))),
        field('本次可用觀測筆數', String(rows.length)),
        ...(data.truncated ? [field('來源觀測筆數', String(data.sourcePointCount)), field('擷取限制', `本次僅列前 ${rows.length} 筆`)] : [])] };
  });
}

export function buildReportContent(snapshot) {
  const project = snapshot.project || {}, warning = snapshot.kind === 'warning';
  const records = investigationEntries(snapshot), photos = photoEntries(snapshot), charts = monitoringEntries(snapshot);
  const dated = records.filter(entry => instant(entry.date) !== null);
  const undated = records.filter(entry => instant(entry.date) === null);
  const mainRecords = [...dated.slice(-MAIN_RECORD_LIMIT), ...undated.slice(0, Math.max(0, MAIN_RECORD_LIMIT - dated.length))]
    .map(entry => ({ ...entry, text: excerpt(entry.text) }));
  const belongs = (photo, entry) => Boolean(entry.sourceProjectId) && photo.sourceProjectId === entry.sourceProjectId;
  const selectedPhotos = [];
  // Cover distinct investigations before taking additional photos from the same source.
  for (const entry of mainRecords) {
    const photo = photos.find(photo => belongs(photo, entry));
    if (photo && selectedPhotos.length < 4) selectedPhotos.push(photo);
  }
  for (const photo of photos) {
    const appendixOnly = records.some(entry => belongs(photo, entry)) && !mainRecords.some(entry => belongs(photo, entry));
    if (!appendixOnly && selectedPhotos.length < 4 && !selectedPhotos.includes(photo)) selectedPhotos.push(photo);
  }
  const mainPhotos = [...mainRecords.flatMap(entry => selectedPhotos.filter(photo => belongs(photo, entry))),
    ...selectedPhotos.filter(photo => !mainRecords.some(entry => belongs(photo, entry)))];
  const remainingPhotos = photos.filter(photo => !mainPhotos.includes(photo));
  const unassigned = values => values.filter(photo => !records.some(entry => belongs(photo, entry)));
  const readingPhotos = [...mainPhotos, ...records.flatMap(entry => remainingPhotos.filter(photo => belongs(photo, entry))), ...unassigned(remainingPhotos)];
  readingPhotos.forEach((photo, index) => {
    const owner = (snapshot.children || []).find(child => child.id === photo.sourceProjectId);
    photo.caption = `圖 ${index + 1} ${photo.name}；拍攝時間：${photo.captureLabel}；上傳時間：${photo.uploadLabel}；來源：GeoPort 專案影像紀錄${owner ? `；所屬調查：${owner.name}` : ''}`;
  });
  const embeddedPhotos = readingPhotos.slice(0, 8);
  mainRecords.forEach(entry => { entry.photos = mainPhotos.filter(photo => belongs(photo, entry)); });
  const standaloneMain = mainPhotos.filter(photo => !mainRecords.some(entry => belongs(photo, entry)));
  const appendixPhotos = embeddedPhotos.filter(photo => !mainPhotos.includes(photo));
  const counts = Object.entries(snapshot.counts || {}).filter(([, count]) => Number.isFinite(count) && count >= 0);
  const countText = counts.map(([name, count]) => count === 0 ? `系統尚無${name}紀錄` : `系統已登錄${name} ${count} 筆`).join('；');
  const event = formatReportDate(project.eventDate);
  const cutoff = snapshot.collectedAt || snapshot.generatedAt;
  const dates = [project.eventDate, ...records.map(entry => entry.date),
    ...(!warning ? (snapshot.points || []).map(point => point.time) : []),
    ...(snapshot.media || []).map(media => media.takenAt),
    ...Object.values(snapshot.charts || {}).map(chart => chart?.observedAt)];
  const limitations = [
    '本報告僅彙整系統登錄內容與本次取得的觀測，並非現地查證結果。',
    '主文與附錄均為本次擷取內容；長文與巢狀欄位設有上限，且已排除敏感欄位，需查閱全文時請回到原始紀錄。',
    '本報告未進行致災機制、邊坡穩定性或現地安全性評估；相關判斷須另經專業確認。',
    ...(event === '未提供' ? ['事件發生時間尚未確認；上傳、登錄與資料更新時間不替代事件發生時間。'] : ['事件日期依登錄欄位列示，尚未經人工確認。']),
    ...(photos.length ? ['影像未經同位置、同範圍對照，不據以判定災前災後變化。'] : ['系統尚無可供本報告呈現的照片紀錄，無法據以描述影像所示現況。']),
    ...(photos.some(photo => (snapshot.media || []).find(media => media.id === photo.id)?.takenAt == null) ? ['部分照片未提供拍攝時間；上傳時間不作為拍攝時間。'] : []),
    ...(charts.length ? ['降雨與系統事件僅呈現各自的觀測資料，未據此判定因果關係。'] : ['本專案未提供監測資料，本報告不判定目前監測狀態。']),
    ...(snapshot.warnings || [])
  ];
  return {
    specVersion: REPORT_SPEC_VERSION, title: warning ? '監測資料彙整報告' : '災情資料彙整報告',
    photos: mainPhotos, embeddedPhotos,
    sections: [
      { id: 'basic', title: '一、基本資訊', paragraphs: ['日期與時間以臺灣時間列示；資料所載日期範圍不代表全期間連續或完整觀測。'],
        fields: [field('專案名稱', project.name), field('專案識別', project.id), field('路線', project.road), field('里程', project.mileage),
          field('事件時間', event === '未提供' ? '未確認' : `未確認；登錄事件日期：${event}`),
          field('資料所載日期範圍', period(dates)), field('資料整理截止時間', formatReportDate(cutoff)),
          field('報告產出時間', formatReportDate(snapshot.generatedAt)), field('編製規格版本', REPORT_SPEC_VERSION)] },
      { id: 'overview', title: '二、事件與現況概要', paragraphs: [
        countText || '本次未提供可核對的資料筆數統計。',
        '上述數量表示系統紀錄筆數，不代表已確認的災害次數、影響範圍或現地安全狀態。'
      ], description: excerpt(text(project.description)) || '尚無專案登錄說明。' },
      { id: 'location', title: '三、區位與圖資', paragraphs: [
        '區位圖以道路底圖標示可定位的專案與點位，監測路段依所屬圖資呈現；不稱為航照或災後現況圖。',
        '點位為 WGS84 經緯度，區位底圖採 Web Mercator；底圖來源未提供拍攝或更新日期。'
      ] },
      { id: 'surveys', title: '四、歷次調查紀錄', paragraphs: [
        records.length ? `本次擷取 ${records.length} 筆調查／巡查紀錄，主文列出 ${mainRecords.length} 筆；其餘擷取文字見附錄，全文請查閱原始紀錄。` : '系統尚無調查或巡查紀錄，無法據以描述現地變化。',
        '紀錄依其可用日期整理；登錄事件日期不視為已確認的調查時間，日期未提供者不推定時間先後。',
        ...(photos.length ? ['照片依系統所屬調查紀錄配列，不以檔名或日期猜測關聯；影像歸屬不代表已確認拍攝時間。'] : [])
      ], entries: mainRecords, photos: standaloneMain },
      { id: 'monitoring', title: '五、監測資料彙整', paragraphs: [
        charts.length ? '各項監測分別列示來源、觀測時間與資料狀態；歷史、缺漏與來源異常不視為目前正常。' : '本專案未提供監測資料，無法判定目前監測現況。'
      ], charts },
      { id: 'limitations', title: '六、待確認事項與資料限制', paragraphs: [...new Set(limitations)] }
    ],
    appendix: { title: '附錄、紀錄與附件索引',
      note: '附錄列出本次擷取的紀錄與附件，並非未刪節的原始紀錄；超出擷取上限的數量另於資料限制標示。',
      description: text(project.description), records: records.map(entry => ({ ...entry, photos: appendixPhotos.filter(photo => belongs(photo, entry)) })),
      points: (snapshot.points || []).map(point => ({ id: point.id, title: point.name || '未命名點位', text: text(point.description), fields: [
        field('座標（WGS84）', `${point.latitude ?? '未提供'}, ${point.longitude ?? '未提供'}`),
        field(warning ? '燈號登錄更新時間' : '登錄災害時間', formatReportDate(point.time)),
        ...(warning ? [field('系統燈號紀錄', ({ red: '紅燈', yellow: '黃燈', green: '綠燈' })[point.level] || '未確認')] : []),
        field('資料依據', `${warning ? '燈號' : '災點'}紀錄 ${point.id}`)
      ] })),
      media: (snapshot.media || []).map(media => ({ ...media, ...photos.find(photo => photo.id === media.id), captureLabel: formatReportDate(media.takenAt), uploadLabel: formatReportDate(media.uploadedAt || media.createdAt) })),
      files: [...(snapshot.files || []), ...(snapshot.layers || [])], photos, unassignedPhotos: unassigned(appendixPhotos),
      sources: snapshot.sources || ['GeoPort 專案資料庫']
    }
  };
}
