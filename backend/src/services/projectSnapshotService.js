import fs from 'node:fs/promises';
import path from 'node:path';
import { Op } from 'sequelize';
import { Project } from '../models/Project.js';
import { DataFile } from '../models/DataFile.js';
import { WarningRegion, WarningRegionLayer } from '../models/WarningRegionLayer.js';
import { PublicationDisasterPoint, PublicationMedia, PublicationInspection, PublicationAlert } from '../models/PublicationRecords.js';
import { resolveStoragePath, storageConfig } from './storageService.js';
import { fetchRegionMonitoring } from './regionMonitoringService.js';
import { publicationError, validatePublicationTarget } from './publicationPolicy.js';
import { buildReportContent } from './projectReportContent.js';

const LIMIT = 200;
const monitoringCache = new Map();
const projectAttributes = ['projectId', 'name', 'description', 'locationGeometry', 'roadNumber', 'startDate', 'endDate', 'status', 'createdAt', 'updatedAt', 'event_date'];
const text = (value, limit = 10000) => typeof value === 'string' ? value.length > limit ? `${value.slice(0, limit)}…（節錄，請查閱原始紀錄）` : value : '';
const coordinate = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) ? Number(value) : null;

function projectDTO(row) {
  const xy = row.locationGeometry?.coordinates;
  return { id: row.projectId, name: text(row.name), description: text(row.description),
    road: text(row.roadNumber), status: row.status, startDate: row.startDate, endDate: row.endDate,
    eventDate: row.event_date, updatedAt: row.updatedAt,
    location: xy ? { longitude: coordinate(xy[0]), latitude: coordinate(xy[1]) } : null };
}

export async function publicationScope(kind, id) {
  validatePublicationTarget(kind, id);
  if (kind === 'warning') {
    const region = await WarningRegion.findOne({ where: { region_id: id, deleted_at: null },
      attributes: ['region_id', 'region_name', 'region_code', 'description', 'location_geometry', 'status', 'updated_at', 'api_config'], raw: true });
    if (!region) throw publicationError(404, '專案不存在或已刪除');
    const xy = region.location_geometry?.coordinates;
    return { region, ids: [id], project: { id, name: text(region.region_name), description: text(region.description),
      road: region.region_code, status: region.status, updatedAt: region.updated_at,
      location: xy ? { longitude: coordinate(xy[0]), latitude: coordinate(xy[1]) } : null }, children: [] };
  }
  const project = await Project.findByPk(id, { attributes: projectAttributes, raw: true });
  if (!project) throw publicationError(404, '專案不存在或已刪除');
  const children = await Project.findAll({ where: { parent_project_id: id }, attributes: projectAttributes,
    order: [['startDate', 'ASC']], limit: LIMIT + 1, raw: true });
  if (children.length > LIMIT) throw publicationError(413, '子專案超過報告上限，請選擇個別子專案');
  return { project: projectDTO(project), children: children.map(projectDTO), ids: [id, ...children.map(child => child.projectId)] };
}

export function cleanInspection(value, depth = 0) {
  if (depth > 4) return '[略]';
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (/^(?:\/?uploads\/|\/?data\/|file:|[A-Za-z]:\\)/i.test(value)) return '[附件]';
    return text(value, 2000);
  }
  if (Array.isArray(value)) return value.slice(0, 50).map(item => cleanInspection(item, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 50)
    .filter(([key]) => !/password|token|secret|credential|authorization|cookie|api_config|storage_path|uploader|owner_id/i.test(key))
    .map(([key, child]) => [key, cleanInspection(child, depth + 1)]));
  return null;
}

function observationInstant(item) {
  const value = item.observedAt;
  if (typeof value === 'string' && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  if (Number.isFinite(item.epoch)) {
    const date = new Date(item.epoch * 1000);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return null;
}

export function monitoringDTO(response) {
  const data = response?.data || {};
  const rows = data.time_series || data.parsed?.timeSeries || [];
  const points = rows.slice(0, 10000).map(item => ({
    time: typeof item.time === 'number' ? item.time : text(item.time || item.datetime || item.timestamp),
    type: text(item.type), value: item.value == null ? null : coordinate(item.value),
    datetime: text(item.datetime), hourly: item.hourly == null ? null : coordinate(item.hourly),
    observedAt: observationInstant(item),
    accumulated: item.accumulated == null ? null : coordinate(item.accumulated),
    absAcceleration: item.absAcceleration == null ? null : coordinate(item.absAcceleration),
    acceleration: item.acceleration == null ? null : coordinate(item.acceleration)
  }));
  const metadata = data.parsed?.metadata || {};
  return { dataStatus: data.dataStatus || response?.dataStatus || 'empty',
    message: text(data.message || response?.message), timestamp: data.timestamp,
    observedAt: data.observedAt, sourceDate: data.sourceDate, pga: data.pga ?? null,
    updateInterval: data.updateInterval, time_series: points, sourcePointCount: rows.length, truncated: rows.length > points.length,
    parsed: { timeSeries: points, metadata: { stationCode: text(metadata.stationCode), startTime: text(metadata.startTime), sampleRate: metadata.sampleRate } } };
}

async function regionCharts(region) {
  const key = `${region.region_id}:${region.updated_at}`;
  const cached = monitoringCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.promise;
  if (monitoringCache.size >= 100) monitoringCache.delete(monitoringCache.keys().next().value);
  const promise = Promise.all(['chart1', 'chart2', 'chart3'].map(async type => {
    const response = await fetchRegionMonitoring(region.region_code, type, region.api_config || {});
    return [type, monitoringDTO(response)];
  })).then(Object.fromEntries);
  monitoringCache.set(key, { expires: Date.now() + 30000, promise });
  try { return await promise; } catch (error) { monitoringCache.delete(key); throw error; }
}

export async function getProjectSnapshot(kind, id) {
  const scope = await publicationScope(kind, id);
  const warnings = [];
  const result = { kind, project: scope.project, generatedAt: new Date().toISOString(),
    children: scope.children, points: [], records: [], media: [], files: [], layers: [], charts: null,
    counts: {}, warnings, sources: ['GeoPort 專案資料庫'] };
  const collect = (name, collection) => {
    result.counts[name] = collection.count;
    if (collection.count > LIMIT) warnings.push(`${name} 共 ${collection.count} 筆，本次列出前 ${LIMIT} 筆`);
    return collection.rows;
  };
  if (kind === 'disaster') {
    const where = { project_id: { [Op.in]: scope.ids }, deleted_at: null };
    const [points, media, files] = await Promise.all([
      PublicationDisasterPoint.findAndCountAll({ where, order: [['disaster_time', 'DESC']], limit: LIMIT, raw: true }),
      PublicationMedia.findAndCountAll({ where, attributes: { exclude: ['storage_path'] }, order: [['created_at', 'DESC']], limit: LIMIT, raw: true }),
      DataFile.findAndCountAll({ where: { projectId: { [Op.in]: scope.ids } },
        attributes: ['fileId', 'projectId', 'originalName', 'fileType', 'mimeType', 'fileSize', 'createdAt'],
        order: [['createdAt', 'DESC']], limit: LIMIT, raw: true })
    ]);
    result.points = collect('災點', points).map(row => ({ id: row.disaster_point_id, name: text(row.name),
      description: text(row.description), latitude: coordinate(row.latitude), longitude: coordinate(row.longitude), time: row.disaster_time }));
    result.media = collect('影像', media).map(row => ({ id: row.media_id, collection: 'media', name: text(row.original_name),
      sourceProjectId: row.project_id,
      mimeType: row.mime_type, size: Number(row.file_size), description: text(row.description),
      takenAt: row.taken_at || null, uploadedAt: row.created_at || null, createdAt: row.created_at }));
    result.files = collect('檔案', files).map(row => ({ id: row.fileId, collection: 'files', name: text(row.originalName),
      type: row.fileType, mimeType: row.mimeType, size: Number(row.fileSize), createdAt: row.createdAt }));
  } else {
    const [records, lights, layers] = await Promise.all([
      PublicationInspection.findAndCountAll({ where: { region_id: id, deleted_at: null }, order: [['created_at', 'DESC']], limit: LIMIT, raw: true }),
      PublicationAlert.findAndCountAll({ where: { region_id: id, deleted_at: null }, order: [['updated_at', 'DESC']], limit: LIMIT, raw: true }),
      WarningRegionLayer.findAndCountAll({ where: { region_id: id, is_active: true },
        attributes: ['layer_id', 'layer_type', 'layer_name', 'updated_at'], limit: LIMIT, raw: true })
    ]);
    result.records = collect('巡查紀錄', records).map(row => ({ id: row.record_id, mileage: text(row.mileage),
      type: row.inspection_type, time: row.inspection_date || null, inspectionDate: row.inspection_date || null,
      registeredAt: row.created_at || null, disaster: row.is_disaster, details: cleanInspection(row.inspection_data) }));
    result.points = collect('告警燈號', lights).map(row => ({ id: row.light_id, name: text(row.mileage), level: row.current_level,
      latitude: coordinate(row.latitude), longitude: coordinate(row.longitude), time: row.updated_at }));
    result.layers = collect('圖層', layers).map(row => ({ id: row.layer_id, collection: 'layers', name: text(row.layer_name), type: row.layer_type, updatedAt: row.updated_at }));
    result.charts = await regionCharts(scope.region);
    for (const [key, label] of [['chart1', '微地動'], ['chart2', '雨量'], ['chart3', '強地動']]) {
      const chart = result.charts[key];
      if (chart.truncated) warnings.push(`${label}原始觀測共 ${chart.sourcePointCount} 筆，本次圖表列出前 ${chart.time_series.length} 筆`);
    }
    result.sources.push('微地動服務', '雨量服務', '強地動服務');
  }
  result.generatedAt = new Date().toISOString();
  result.collectedAt = result.generatedAt;
  result.report = buildReportContent(result);
  return result;
}

export async function resolvePublicationAsset(kind, id, collection, assetId) {
  validatePublicationTarget(kind, assetId);
  const scope = await publicationScope(kind, id);
  let row;
  if (kind === 'disaster' && collection === 'media') row = await PublicationMedia.findOne({
    where: { media_id: assetId, project_id: { [Op.in]: scope.ids }, deleted_at: null }, raw: true });
  if (kind === 'disaster' && collection === 'files') {
    const file = await DataFile.findOne({ where: { fileId: assetId, projectId: { [Op.in]: scope.ids } },
      attributes: ['storagePath', 'originalName', 'mimeType', 'fileSize'], raw: true });
    if (file) row = { storage_path: file.storagePath, original_name: file.originalName, mime_type: file.mimeType, file_size: file.fileSize };
  }
  if (kind === 'warning' && collection === 'layers') {
    const layer = await WarningRegionLayer.findOne({ where: { layer_id: assetId, region_id: id, is_active: true }, raw: true });
    if (layer) row = { storage_path: layer.storage_path, original_name: layer.layer_name };
  }
  if (!row) throw publicationError(404, '附件不存在');
  const resolved = resolveStoragePath(row.storage_path);
  if (!resolved) throw publicationError(404, '附件不存在');
  let actual;
  try {
    actual = await fs.realpath(resolved);
    const roots = await Promise.all([storageConfig.uploadsRoot, storageConfig.dataRoot].map(root => fs.realpath(root)));
    if (!roots.some(root => actual.startsWith(`${root}${path.sep}`))) throw new Error('Outside storage');
    const stat = await fs.stat(actual);
    if (!stat.isFile()) throw new Error('Not a regular file');
    return { path: actual, name: row.original_name || path.basename(actual), mimeType: row.mime_type || 'application/octet-stream', size: stat.size };
  } catch { throw publicationError(404, '附件不存在'); }
}
