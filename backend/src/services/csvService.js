import fs from 'node:fs';
import csv from 'csv-parser';

export function readCSV(filePath, columns = [], headersOnly = false) {
  return new Promise((resolve, reject) => {
    const source = fs.createReadStream(filePath);
    const parser = csv({ headers: false, maxRowBytes: 16 * 1024 * 1024 });
    const rows = [];
    let headers = [];
    const stop = () => { source.unpipe(parser); source.destroy(); parser.destroy(); };
    source.on('error', error => { stop(); reject(error); });
    parser.on('error', error => { stop(); reject(Object.assign(error, { status: 400 })); });
    parser.on('data', record => {
      const values = Object.values(record);
      if (values.every(value => !value.trim())) return;
      if (!headers.length) {
        headers = values.map(header => header.replace(/^\uFEFF/, '').trim());
        if (new Set(headers).size !== headers.length || headers.some(name => !name)) {
          stop(); reject(Object.assign(new Error('CSV 欄位名稱不可空白或重複'), { status: 400 })); return;
        }
        const missing = columns.filter(name => !headers.includes(name));
        if (missing.length) {
          stop(); reject(Object.assign(new Error(`CSV 缺少欄位：${missing.join(', ')}`), { status: 400 })); return;
        }
        if (headersOnly) { stop(); resolve({ headers, rows }); }
        return;
      }
      if (values.length !== headers.length) {
        stop(); reject(Object.assign(new Error('CSV 資料列欄數與標題不一致'), { status: 400 })); return;
      }
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
      rows.push(columns.length ? Object.fromEntries(columns.map(name => [name, row[name]])) : row);
    });
    parser.on('end', () => resolve({ headers, rows }));
    source.pipe(parser);
  });
}

export async function readCSVColumns(filePath) {
  return (await readCSV(filePath, [], true)).headers;
}

export function parseCSVNumber(value) {
  if (value == null || String(value).trim() === '') return null;
  let text = String(value).trim();
  if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)) text = text.replaceAll(',', '');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}
