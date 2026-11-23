import express from 'express';
import rateLimit from 'express-rate-limit';
import { DataFile } from '../models/DataFile.js';
import { WarningRegionLayer } from '../models/WarningRegionLayer.js';
import { PublicationMedia } from '../models/PublicationRecords.js';
import { validatePublicationTarget, publicationError, signAssetGrant } from '../services/publicationPolicy.js';
import { getProjectSnapshot, resolvePublicationAsset } from '../services/projectSnapshotService.js';
import { createProjectShare, listProjectShares, revokeProjectShare, resolveProjectShare } from '../services/projectShareService.js';
import { loadReportPhotos, renderProjectReport } from '../services/projectReportService.js';
import { toStoragePath } from '../services/storageService.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('project-publications');
const endpoint = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
const mutationLimit = rateLimit({ windowMs: 3600000, limit: 30, standardHeaders: true, legacyHeaders: false });
const exportLimit = rateLimit({ windowMs: 60000, limit: 10, standardHeaders: true, legacyHeaders: false });
const guestLimit = rateLimit({ windowMs: 60000, limit: 120, standardHeaders: true, legacyHeaders: false });
const editor = (req, res, next) => ['admin', 'editor'].includes(req.user?.role)
  ? next() : res.status(403).json({ success: false, message: '僅管理者或編輯者可管理分享連結' });

export const projectPublications = express.Router();
projectPublications.use('/:kind/:id', (req, res, next) => {
  try { validatePublicationTarget(req.params.kind, req.params.id); next(); } catch (error) { next(error); }
});
projectPublications.get('/:kind/:id', endpoint(async (req, res) => {
  res.json({ success: true, data: await getProjectSnapshot(req.params.kind, req.params.id) });
}));
projectPublications.get('/:kind/:id/shares', editor, endpoint(async (req, res) => {
  res.json({ success: true, data: await listProjectShares(req.params.kind, req.params.id) });
}));
projectPublications.post('/:kind/:id/shares', editor, mutationLimit, endpoint(async (req, res) => {
  res.status(201).json({ success: true, data: await createProjectShare(req.params.kind, req.params.id, req.user) });
}));
projectPublications.delete('/:kind/:id/shares/:shareId', editor, endpoint(async (req, res) => {
  validatePublicationTarget(req.params.kind, req.params.shareId);
  await revokeProjectShare(req.params.kind, req.params.id, req.params.shareId);
  res.json({ success: true });
}));
projectPublications.get('/:kind/:id/assets/:collection/:assetId', endpoint(async (req, res) => {
  const asset = await resolvePublicationAsset(req.params.kind, req.params.id, req.params.collection, req.params.assetId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(asset.mimeType).sendFile(asset.path);
}));
projectPublications.get('/:kind/:id/report/:format', exportLimit, endpoint(async (req, res) => {
  if (!['pdf', 'docx'].includes(req.params.format)) throw publicationError(400, '報告格式必須為 PDF 或 Word');
  const snapshot = await getProjectSnapshot(req.params.kind, req.params.id);
  const { photos, warnings } = await loadReportPhotos(snapshot);
  const buffer = await renderProjectReport({ ...snapshot, warnings: [...snapshot.warnings, ...warnings] }, req.params.format, { photos });
  const name = `${snapshot.project.name.replace(/[\r\n/\\]/g, '_').slice(0, 100)}.${req.params.format}`;
  log.info('Project report exported', { kind: req.params.kind, targetId: req.params.id, format: req.params.format, bytes: buffer.length });
  res.setHeader('Content-Disposition', `attachment; filename="project-report.${req.params.format}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.type(req.params.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').send(buffer);
}));

export const sharedProject = express.Router();
sharedProject.use((req, res, next) => {
  res.set({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).set('Allow', 'GET, HEAD').json({ success: false, message: '分享頁僅供唯讀檢視' });
  next();
});
sharedProject.use(guestLimit, (req, res, next) => {
  resolveProjectShare(req.get('X-Share-Token')).then(share => { req.projectShare = share; next(); })
    .catch(error => next([400, 404].includes(error.status) ? publicationError(404, '分享連結已失效或不存在') : error));
});
sharedProject.get('/', endpoint(async (req, res) => {
  const { kind, id, expiresAt } = req.projectShare;
  res.json({ success: true, data: { ...await getProjectSnapshot(kind, id), expiresAt } });
}));
sharedProject.get('/assets/:collection/:assetId', endpoint(async (req, res) => {
  const { kind, id } = req.projectShare;
  const asset = await resolvePublicationAsset(kind, id, req.params.collection, req.params.assetId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(asset.mimeType).sendFile(asset.path);
}));

export const projectAssets = express.Router();
projectAssets.get('/sign', endpoint(async (req, res) => {
  const input = req.query.path;
  if (typeof input !== 'string' || input.length > 1024 || !/^(uploads|data)\//.test(input) || input.split('/').includes('..') || input.includes('\\')) {
    throw publicationError(400, '無效的附件路徑');
  }
  const storagePath = toStoragePath(input);
  const exists = await DataFile.findOne({ where: { storagePath }, attributes: ['fileId'], raw: true }) ||
    await PublicationMedia.findOne({ where: { storage_path: storagePath, deleted_at: null }, attributes: ['media_id'], raw: true }) ||
    await WarningRegionLayer.findOne({ where: { storage_path: storagePath, is_active: true }, attributes: ['layer_id'], raw: true });
  if (!exists) throw publicationError(404, '附件不存在');
  const assetToken = signAssetGrant({ path: storagePath, userId: req.user.userId, credentialVersion: req.authCredentialVersion }, process.env.JWT_SECRET);
  res.json({ success: true, data: { assetToken, expiresAt: new Date(Date.now() + 300000).toISOString() } });
}));
