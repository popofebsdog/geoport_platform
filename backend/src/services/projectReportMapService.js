import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import proj4 from 'proj4';
import { resolvePublicationAsset } from './projectSnapshotService.js';
import { publicationError } from './publicationPolicy.js';

proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
const WIDTH = 1000, HEIGHT = 500, HALF_WORLD = 20037508.342789244;
const pendingTiles = new Map();
const attribution = '© OpenStreetMap contributors';
const cacheRoot = () => process.env.REPORT_MAP_CACHE_DIR || path.join(os.tmpdir(), 'geoport-report-tiles-v1');

async function loadTile(z, x, y, signal) {
  const key = `${z}-${x}-${y}`;
  if (pendingTiles.has(key)) return pendingTiles.get(key);
  const promise = (async () => {
    const file = path.join(cacheRoot(), `${key}.png`);
    try {
      const stat = await fs.stat(file);
      if (Date.now() - stat.mtimeMs < 7 * 86400000) return await fs.readFile(file);
    } catch { /* A new map viewport may not be cached yet. */ }
    const response = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
      headers: { 'User-Agent': 'GeoPortReports/1.0 (+https://github.com/popofebsdog/geoport_platform)' }, signal, redirect: 'error'
    });
    if (!response.ok || Number(response.headers.get('content-length')) > 2 * 1024 * 1024) throw new Error('Basemap unavailable');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 2 * 1024 * 1024) throw new Error('Basemap tile is too large');
    const metadata = await sharp(bytes, { limitInputPixels: 256 * 256 }).metadata();
    if (metadata.width !== 256 || metadata.height !== 256 || metadata.format !== 'png') throw new Error('Invalid basemap tile');
    await fs.mkdir(cacheRoot(), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    try { await fs.writeFile(temporary, bytes); await fs.rename(temporary, file); }
    finally { await fs.rm(temporary, { force: true }); }
    return bytes;
  })();
  pendingTiles.set(key, promise);
  try { return await promise; } finally { pendingTiles.delete(key); }
}

const roadName = value => {
  const input = String(value || '').replace(/^臺/, '台');
  const taiwan = input.match(/^taiwan(\d+)(?:l(\d+))?$/i);
  if (taiwan) return `台${taiwan[1]}${taiwan[2] ? `臨${taiwan[2]}` : ''}線`;
  return input.replace(/^national(\d+)$/i, '國道$1號');
};
const validPoint = point => point && Number.isFinite(point.longitude) && Number.isFinite(point.latitude) && Math.abs(point.longitude) <= 180 && Math.abs(point.latitude) < 85.05;

async function loadRoadPaths(snapshot) {
  if (snapshot.kind !== 'warning') return [];
  const section = snapshot.project.description?.match(/工務段[：:]\s*([^，,]+)/)?.[1]?.trim();
  const paths = []; let count = 0;
  const coordinate = xy => {
    if (!Array.isArray(xy) || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1]) || count++ >= 20000) return null;
    let [longitude, latitude] = xy;
    if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
      if (!(longitude > 10000 && longitude < 1000000 && latitude > 1000000 && latitude < 4000000)) return null;
      [longitude, latitude] = proj4('EPSG:3826', 'EPSG:4326', [longitude, latitude]);
    }
    return validPoint({ longitude, latitude }) ? [longitude, latitude] : null;
  };
  const geometry = (value, depth = 0) => {
    if (!value || depth > 8 || count >= 20000) return;
    if (value.type === 'GeometryCollection') { for (const child of value.geometries || []) geometry(child, depth + 1); return; }
    const input = value.coordinates;
    if (value.type === 'Point') { const point = coordinate(input); if (point) paths.push([point]); }
    if (value.type === 'MultiPoint') for (const point of input || []) geometry({ type: 'Point', coordinates: point }, depth + 1);
    if (value.type === 'LineString') { const line = (input || []).map(coordinate).filter(Boolean); if (line.length) paths.push(line); }
    if (['Polygon', 'MultiLineString'].includes(value.type)) for (const line of input || []) geometry({ type: 'LineString', coordinates: line }, depth + 1);
    if (value.type === 'MultiPolygon') for (const polygon of input || []) geometry({ type: 'Polygon', coordinates: polygon }, depth + 1);
  };
  for (const layer of snapshot.layers.filter(item => item.type === 'road')) {
    if (count >= 20000) break;
    const asset = await resolvePublicationAsset(snapshot.kind, snapshot.project.id, layer.collection, layer.id);
    if (asset.size > 5 * 1024 * 1024) throw publicationError(413, '道路圖層過大，無法加入報告地圖');
    const data = JSON.parse(await fs.readFile(asset.path, 'utf8'));
    const features = data.type === 'FeatureCollection' ? data.features : data.type === 'Feature' ? [data] : [];
    for (const feature of (features || []).slice(0, 20000)) {
      const props = feature.properties || {};
      if (props.公路編 && roadName(props.公路編) !== roadName(snapshot.project.road)) continue;
      if (section && props.工務段 && props.工務段 !== section) continue;
      geometry(feature.geometry);
    }
  }
  return paths;
}

function pixels(xy, zoom) {
  const [east, north] = proj4('EPSG:4326', 'EPSG:3857', xy);
  const world = 256 * 2 ** zoom;
  return [(east + HALF_WORLD) / (2 * HALF_WORLD) * world, (HALF_WORLD - north) / (2 * HALF_WORLD) * world];
}

export async function renderReportMap(snapshot, { tileLoader = loadTile, roadLoader = loadRoadPaths } = {}) {
  const points = [snapshot.project.location && { ...snapshot.project.location, name: snapshot.project.name },
    ...snapshot.children.map(child => child.location && { ...child.location, name: child.name }), ...snapshot.points].filter(validPoint);
  const roads = await roadLoader(snapshot);
  const groups = new Map();
  points.forEach((point, index) => {
    const key = `${point.longitude.toFixed(6)},${point.latitude.toFixed(6)}`;
    if (!groups.has(key)) groups.set(key, { point, items: [] });
    groups.get(key).items.push({ number: index + 1, name: point.name || '未命名點位' });
  });
  const coordinates = [...points.map(point => [point.longitude, point.latitude]), ...roads.flat()];
  if (!coordinates.length) return null;
  let zoom = 15, projected, left, top;
  for (; zoom >= 0; zoom--) {
    projected = coordinates.map(point => pixels(point, zoom));
    const xs = projected.map(point => point[0]), ys = projected.map(point => point[1]);
    const west = Math.min(...xs), east = Math.max(...xs), north = Math.min(...ys), south = Math.max(...ys);
    left = Math.round((west + east - WIDTH) / 2); top = Math.round((north + south - HEIGHT) / 2);
    if (east - west < WIDTH - 140 && south - north < HEIGHT - 140) break;
  }
  if (zoom < 0) throw publicationError(413, '圖資範圍超出報告地圖可呈現範圍');
  const firstX = Math.floor(left / 256), lastX = Math.floor((left + WIDTH - 1) / 256);
  const firstY = Math.floor(top / 256), lastY = Math.floor((top + HEIGHT - 1) / 256);
  const jobs = [];
  for (let y = firstY; y <= lastY; y++) for (let x = firstX; x <= lastX; x++) jobs.push({ x, y });
  const signal = AbortSignal.timeout(10000), tiles = []; let next = 0;
  try {
    await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++], n = 2 ** zoom;
        if (job.y < 0 || job.y >= n) continue;
        const input = await tileLoader(zoom, (job.x % n + n) % n, job.y, signal);
        tiles.push({ input, left: (job.x - firstX) * 256, top: (job.y - firstY) * 256 });
      }
    }));
    const basemap = await sharp({ create: { width: (lastX - firstX + 1) * 256, height: (lastY - firstY + 1) * 256, channels: 3, background: '#eef2f3' } })
      .composite(tiles).png().toBuffer();
    const position = xy => { const [x, y] = pixels(xy, zoom); return [x - left, y - top]; };
    const roadOverlay = roads.map(line => {
      const positions = line.map(position);
      if (positions.length === 1) return `<circle cx="${positions[0][0]}" cy="${positions[0][1]}" r="2" fill="#2160b3"/>`;
      return `<polyline points="${positions.map(xy => xy.join(',')).join(' ')}" fill="none" stroke="#2160b3" stroke-width="4" stroke-linejoin="round"/>`;
    }).join('');
    const label = group => group.items.length > 4 ? `${group.items[0].number}+${group.items.length - 1}` : group.items.map(item => item.number).join(', ');
    const markers = [...groups.values()].map(group => {
      const point = group.point;
      const [x, y] = position([point.longitude, point.latitude]);
      return `<circle cx="${x}" cy="${y}" r="9" fill="${group.items[0].number > 1 ? '#b94e3f' : '#117d80'}" stroke="white" stroke-width="3"/><text x="${x + 13}" y="${y - 9}" font-size="16" font-family="sans-serif" fill="#172a33" stroke="white" stroke-width="3" paint-order="stroke">${label(group)}</text>`;
    }).join('');
    const centerLat = coordinates.reduce((sum, xy) => sum + xy[1], 0) / coordinates.length;
    const metersPerPixel = Math.cos(centerLat * Math.PI / 180) * 2 * HALF_WORLD / (256 * 2 ** zoom);
    const magnitude = 10 ** Math.floor(Math.log10(metersPerPixel * 120));
    const meters = [5, 2, 1].map(value => value * magnitude).find(value => value <= metersPerPixel * 120) || magnitude;
    const scale = meters / metersPerPixel;
    const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${roadOverlay}${markers}<rect y="${HEIGHT - 28}" width="${WIDTH}" height="28" fill="white" fill-opacity="0.93"/><path d="M20 ${HEIGHT - 12}v-6m0 4h${scale}m0 2v-6" stroke="#172a33" stroke-width="2"/><text x="${28 + scale}" y="${HEIGHT - 7}" font-family="sans-serif" font-size="13">${meters >= 1000 ? `${meters / 1000} km` : `${meters} m`}</text><text x="${WIDTH - 12}" y="${HEIGHT - 8}" text-anchor="end" font-family="sans-serif" font-size="13">${attribution}</text><rect x="945" y="12" width="42" height="64" fill="white" fill-opacity="0.9"/><text x="966" y="32" text-anchor="middle" font-family="sans-serif" font-size="17">N</text><path d="M966 65V40m-6 8 6-8 6 8" stroke="#172a33" fill="none" stroke-width="2"/></svg>`);
    const buffer = await sharp(basemap).extract({ left: left - firstX * 256, top: top - firstY * 256, width: WIDTH, height: HEIGHT }).composite([{ input: overlay }]).png().toBuffer();
    return { buffer, width: WIDTH, height: HEIGHT, attribution, zoom, legend: [...groups.values()].map(group => `${label(group)} ${group.items.map(item => item.name).join('、')}`) };
  } catch { throw publicationError(503, '報告地圖底圖暫時無法載入，請稍後重試'); }
}
