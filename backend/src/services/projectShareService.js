import { ProjectShare } from '../models/ProjectShare.js';
import { Op } from 'sequelize';
import { publicationScope } from './projectSnapshotService.js';
import { newShareSecret, hashShareSecret, isShareActive, publicationError } from './publicationPolicy.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('project-sharing');
const targetWhere = (kind, id) => ({ kind, ...(kind === 'disaster' ? { project_id: id } : { region_id: id }) });
const publicShare = row => ({ id: row.share_id, createdAt: row.created_at, expiresAt: row.expires_at,
  revokedAt: row.revoked_at, active: isShareActive(row) });

export async function createProjectShare(kind, id, user) {
  await publicationScope(kind, id);
  const secret = newShareSecret();
  const share = await ProjectShare.create({ ...targetWhere(kind, id), token_hash: secret.hash,
    created_by: user.userId, expires_at: new Date(Date.now() + 7 * 86400000) });
  log.info('Project share created', { shareId: share.share_id, kind, targetId: id, expiresAt: share.expires_at });
  return { ...publicShare(share), token: secret.token };
}

export async function listProjectShares(kind, id) {
  await publicationScope(kind, id);
  const where = targetWhere(kind, id);
  const [active, recent] = await Promise.all([
    ProjectShare.findAll({ where: { ...where, revoked_at: null, expires_at: { [Op.gt]: new Date() } }, order: [['created_at', 'DESC']] }),
    ProjectShare.findAll({ where, order: [['created_at', 'DESC']], limit: 50 })
  ]);
  return [...new Map([...active, ...recent].map(row => [row.share_id, row])).values()]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(publicShare);
}

export async function revokeProjectShare(kind, id, shareId) {
  await publicationScope(kind, id);
  const share = await ProjectShare.findOne({ where: { ...targetWhere(kind, id), share_id: shareId } });
  if (!share) throw publicationError(404, '分享紀錄不存在');
  if (!share.revoked_at) await share.update({ revoked_at: new Date() });
  log.info('Project share revoked', { shareId, kind, targetId: id });
}

export async function resolveProjectShare(token) {
  const token_hash = hashShareSecret(token);
  const share = await ProjectShare.findOne({ where: { token_hash } });
  if (!isShareActive(share)) throw publicationError(404, '分享連結已失效或不存在');
  const id = share.kind === 'disaster' ? share.project_id : share.region_id;
  await publicationScope(share.kind, id);
  return { kind: share.kind, id, expiresAt: share.expires_at };
}
