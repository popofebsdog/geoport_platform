import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Footer, PageNumber } from 'docx';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolvePublicationAsset } from './projectSnapshotService.js';
import { publicationError } from './publicationPolicy.js';
import { renderReportMap } from './projectReportMapService.js';
import { buildReportContent } from './projectReportContent.js';

const fontPath = fileURLToPath(new URL('../../assets/fonts/Iansui-Regular.ttf', import.meta.url));
const wordFont = { ascii: 'Iansui', hAnsi: 'Iansui', eastAsia: 'Iansui', cs: 'Iansui' };
const FONT_SIZE = 12;

function chartSVG(type, data) {
  if (!data?.time_series?.length) return null;
  const series = data.time_series;
  if (type === 'chart1') {
    const known = ['TYPE I', 'TYPE II', 'TYPE III', 'TYPE IV', 'TYPE NOISE', 'TYPE EARTHQUAKE', 'TYPE ROCKFALL', 'TYPE LANDSLIDE'];
    const types = [...known, 'OTHER'];
    const counts = types.map(type => series.filter(row => type === 'OTHER' ? !known.includes(row.type) : row.type === type).length);
    const max = Math.max(1, ...counts);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="300"><rect width="1000" height="300" fill="white"/>${types.map((type, index) => `<text x="20" y="${29 + index * 30}" font-family="sans-serif" font-size="15">${type}</text><rect x="205" y="${10 + index * 30}" width="${counts[index] / max * 700}" height="23" fill="#157e82"/><text x="${215 + counts[index] / max * 700}" y="${29 + index * 30}" font-family="sans-serif" font-size="15">${counts[index]}</text>`).join('')}</svg>`;
  }
  const values = series.map((row, index) => ({ x: type === 'chart3' && typeof row.time === 'number' ? row.time : index,
    y: type === 'chart3' ? row.absAcceleration ?? row.acceleration : row.hourly ?? row.value })).filter(row => typeof row.y === 'number' && Number.isFinite(row.y));
  if (!values.length) return null;
  const xmin = Math.min(...values.map(row => row.x)), xmax = Math.max(xmin + 1, ...values.map(row => row.x));
  const ymin = Math.min(0, ...values.map(row => row.y)), ymax = Math.max(ymin + 1, ...values.map(row => row.y));
  const line = values.map(row => `${70 + (row.x - xmin) / (xmax - xmin) * 870},${245 - (row.y - ymin) / (ymax - ymin) * 205}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="300"><rect width="1000" height="300" fill="white"/>${Array.from({ length: 5 }, (_, index) => `<path d="M70 ${40 + index * 51.25}H940" stroke="#d8e3e5"/><text x="8" y="${45 + index * 51.25}" font-family="sans-serif" font-size="14">${(ymax - (ymax - ymin) * index / 4).toFixed(2)}</text>`).join('')}<polyline points="${line}" fill="none" stroke="${type === 'chart3' ? '#bf4437' : '#157e82'}" stroke-width="2"/><text x="70" y="282" font-family="sans-serif" font-size="15">${type === 'chart3' ? 'Time (s)' : 'Observation index'}</text><text x="850" y="282" font-family="sans-serif" font-size="15">${type === 'chart3' ? 'gal' : 'mm'}</text></svg>`;
}

async function reportBlocks(snapshot, photos, mapRenderer) {
  const report = buildReportContent(snapshot);
  const blocks = [{ title: snapshot.project.name, level: 0 }, { text: report.title, muted: true }];
  const fields = values => values.forEach(item => blocks.push({ text: `${item.label}：${item.value}`, muted: true }));
  const entries = values => values.forEach(entry => {
    const start = blocks.length;
    blocks.push({ subtitle: entry.title }); fields(entry.fields);
    if (entry.text) blocks.push({ text: `原始登錄文字：${entry.text}` });
    (entry.photos || []).forEach((item, index) => {
      photo(item);
      if (index === 0 && entry.text.length <= 500) blocks[start].keepThrough = blocks.length - start - 1;
    });
  });
  const photo = descriptor => {
    const image = photos.find(item => item.id === descriptor.id);
    if (image) blocks.push({ image: image.buffer, width: image.width, height: image.height, keepNext: true });
    else blocks.push({ text: '此筆影像目前未能載入報告。', muted: true });
    blocks.push({ text: descriptor.caption, muted: true });
    if (descriptor.description) blocks.push({ text: `原始登錄說明：${descriptor.description}`, muted: true });
  };
  for (const section of report.sections) {
    blocks.push({ title: section.title });
    section.paragraphs.forEach(value => blocks.push({ text: value }));
    if (section.fields) fields(section.fields);
    if (section.description) blocks.push({ subtitle: '原始專案說明（登錄內容）' }, { text: section.description });
    if (section.id === 'location') {
      const map = await mapRenderer(snapshot);
      if (map) blocks.push({ image: map.buffer, width: map.width, height: map.height },
        { text: `區位底圖：${map.attribution}；藍色為所選監測路段，編號為專案與點位。`, muted: true },
        { text: '底圖授權：https://www.openstreetmap.org/copyright', muted: true },
        ...(map.legend?.length ? [{ text: map.legend.join('　'), muted: true }] : []));
      else blocks.push({ text: '目前未有可用座標或所屬路段資料，無法定位區位圖。', muted: true });
    }
    if (section.entries) entries(section.entries);
    if (section.id === 'surveys' && section.photos.length) {
      blocks.push({ subtitle: '其他專案影像紀錄' });
      section.photos.forEach(photo);
    }
    for (const chart of section.charts || []) {
      blocks.push({ subtitle: `${chart.title}　${chart.status}` }); fields(chart.fields);
      chart.paragraphs.forEach(value => blocks.push({ text: value, muted: true }));
      const data = snapshot.charts?.[chart.key];
      const svg = ['ok', 'historical'].includes(data?.dataStatus) ? chartSVG(chart.key, data) : null;
      if (svg) blocks.push({ image: await sharp(Buffer.from(svg)).png().toBuffer(), width: 1000, height: 300 });
      else blocks.push({ text: '本次無可繪製的觀測資料。', muted: true });
    }
  }
  const appendix = report.appendix;
  blocks.push({ title: appendix.title, pageBreak: true }, { text: appendix.note, muted: true });
  if (appendix.description) blocks.push({ subtitle: '專案登錄說明（本次擷取）' }, { text: appendix.description });
  blocks.push({ subtitle: '調查與巡查紀錄' });
  if (appendix.records.length) entries(appendix.records);
  else blocks.push({ text: '本次無調查或巡查紀錄。' });
  blocks.push({ subtitle: snapshot.kind === 'warning' ? '燈號登錄紀錄' : '災點登錄紀錄' });
  if (appendix.points.length) entries(appendix.points);
  else blocks.push({ text: '本次無點位紀錄。' });
  if (appendix.unassignedPhotos.length) { blocks.push({ subtitle: '其他專案影像紀錄' }); appendix.unassignedPhotos.forEach(photo); }
  blocks.push({ subtitle: '影像與附件索引' });
  appendix.media.forEach(item => {
    blocks.push({ text: `${item.caption || `${item.name}；拍攝時間：${item.captureLabel}；上傳時間：${item.uploadLabel}`}；資料依據：影像紀錄 ${item.id}` });
    if (item.description) blocks.push({ text: `原始登錄說明：${item.description}`, muted: true });
  });
  appendix.files.forEach(item => blocks.push({ text: `${item.name}；資料依據：${item.collection} ${item.id}` }));
  if (!appendix.media.length && !appendix.files.length) blocks.push({ text: '本次無影像或附件紀錄。' });
  blocks.push({ subtitle: '資料來源' }, { text: appendix.sources.join('、') });
  return blocks;
}

export async function loadReportPhotos(snapshot) {
  const photos = [], warnings = [];
  const candidates = buildReportContent(snapshot).embeddedPhotos.map(photo => snapshot.media.find(media => media.id === photo.id));
  for (const media of candidates) {
    try {
      const asset = await resolvePublicationAsset(snapshot.kind, snapshot.project.id, media.collection, media.id);
      if (asset.size > 15 * 1024 * 1024) throw new Error('Photo exceeds report limit');
      const bytes = await fs.readFile(asset.path);
      const image = await sharp(bytes, { limitInputPixels: 20000000 }).rotate().resize({ width: 1400, height: 900, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
      photos.push({ id: media.id, name: media.name, buffer: image.data, width: image.info.width, height: image.info.height });
    } catch { warnings.push(`影像「${media.name}」目前無法納入報告。`); }
  }
  return { photos, warnings };
}

function pdf(blocks, snapshot) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true,
      info: { Title: snapshot.project.name, Author: 'GeoPort', Subject: '專案資料報告' } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    try {
      doc.font(fontPath);
      const room = height => { if (doc.y + height > doc.page.height - 65) doc.addPage(); };
      const heightOf = block => {
        if (block.image) return Math.min(245, block.height / block.width * 498) + 14;
        return doc.fontSize(FONT_SIZE).heightOfString(block.title || block.subtitle || block.text, { width: 498, lineGap: 5 }) + (block.title || block.subtitle ? 24 : 8);
      };
      for (const [index, block] of blocks.entries()) {
        if (block.pageBreak) doc.addPage();
        if (block.keepThrough) {
          const height = blocks.slice(index, index + block.keepThrough + 1).reduce((total, next) => total + heightOf(next), 0);
          if (height <= doc.page.height - 113) room(height);
        }
        if (block.image) {
          const height = Math.min(245, block.height / block.width * 498), width = height / block.height * block.width;
          room(height + 14 + (block.keepNext && blocks[index + 1] ? heightOf(blocks[index + 1]) : 0));
          const y = doc.y; doc.image(block.image, 48, y, { width, height }); doc.y = y + height + 10;
        } else if (block.title || block.subtitle) {
          room(70); doc.fontSize(FONT_SIZE).moveDown(0.6)
            .fillColor('#172a33').text(block.title || block.subtitle, { width: 498, lineGap: 5 }); doc.moveDown(0.35);
        } else {
          room(40); doc.fontSize(FONT_SIZE).fillColor(block.muted ? '#5e6e76' : '#172a33')
            .text(block.text, { width: 498, lineGap: 5 }); doc.moveDown(0.5);
        }
      }
      const range = doc.bufferedPageRange();
      for (let page = 0; page < range.count; page++) {
        doc.switchToPage(page);
        const bottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.fontSize(FONT_SIZE).fillColor('#6b7b83').text(`GeoPort   ${page + 1} / ${range.count}`, 48, doc.page.height - 37,
          { width: 498, align: 'right', lineBreak: false });
        doc.page.margins.bottom = bottom;
      }
      doc.end();
    } catch (error) { doc.destroy(error); reject(error); }
  });
}

async function word(blocks, snapshot) {
  let keepUntil = -1;
  const children = blocks.map((block, index) => {
    if (block.keepThrough) keepUntil = index + block.keepThrough;
    const keepNext = block.keepNext || index < keepUntil || undefined;
    if (block.image) {
      const height = Math.min(250, block.height / block.width * 620), width = height / block.height * block.width;
      return new Paragraph({ alignment: AlignmentType.CENTER, keepNext, spacing: { after: 160 },
        children: [new ImageRun({ data: block.image, type: block.image[0] === 0xff ? 'jpg' : 'png', transformation: { width, height }, altText: { title: '專案圖像', description: snapshot.project.name, name: 'project-figure' } })] });
    }
    if (block.title) return new Paragraph({ children: [new TextRun({ text: block.title, font: wordFont })], heading: block.level === 0 ? HeadingLevel.TITLE : HeadingLevel.HEADING_1,
      keepNext: true, pageBreakBefore: Boolean(block.pageBreak), spacing: { before: 260, after: 160 } });
    if (block.subtitle) return new Paragraph({ children: [new TextRun({ text: block.subtitle, font: wordFont })], heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 200, after: 100 } });
    return new Paragraph({ children: [new TextRun({ text: block.text, font: wordFont, color: block.muted ? '5E6E76' : '172A33', size: FONT_SIZE * 2 })],
      keepNext, spacing: { after: 150, line: 360, lineRule: 'auto' } });
  });
  return Packer.toBuffer(new Document({ creator: 'GeoPort', title: snapshot.project.name, description: '專案資料報告',
    fonts: [{ name: 'Iansui', data: await fs.readFile(fontPath) }],
    styles: { default: { document: { run: { font: wordFont, size: FONT_SIZE * 2, color: '172A33' }, paragraph: { spacing: { line: 360, lineRule: 'auto' } } },
      title: { run: { size: FONT_SIZE * 2, color: '172A33', bold: true } },
      heading1: { run: { size: FONT_SIZE * 2, color: '172A33', bold: true } },
      heading2: { run: { size: FONT_SIZE * 2, color: '172A33', bold: true } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 960, right: 960 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: ['GeoPort   ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], font: wordFont, size: FONT_SIZE * 2, color: '6B7B83' })] })] }) }, children }] }));
}

export async function renderProjectReport(snapshot, format, { photos = [], mapRenderer = renderReportMap } = {}) {
  if (!['pdf', 'docx'].includes(format)) throw publicationError(400, '報告格式必須為 PDF 或 Word');
  const blocks = await reportBlocks(snapshot, photos, mapRenderer);
  return format === 'pdf' ? pdf(blocks, snapshot) : word(blocks, snapshot);
}
