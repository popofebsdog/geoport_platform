import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(backendRoot, '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

function resolveRoot(value, fallback) {
  if (!value) return fallback;
  return path.isAbsolute(value) ? value : path.resolve(backendRoot, value);
}

const uploadsRoot = resolveRoot(process.env.UPLOADS_ROOT, path.join(backendRoot, 'uploads'));
const dataRoot = resolveRoot(process.env.DATA_ROOT, path.join(projectRoot, 'data'));
const uploadsPublicPath = process.env.UPLOADS_PUBLIC_PATH || '/uploads';
const dataPublicPath = process.env.DATA_PUBLIC_PATH || '/data';

export const storageConfig = {
  provider,
  uploadsRoot,
  dataRoot,
  uploadsPublicPath,
  dataPublicPath,
  objectBucket: process.env.STORAGE_BUCKET || '',
  objectRegion: process.env.STORAGE_REGION || '',
  objectBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL || ''
};

export class StorageAdapter {
  constructor(config) {
    this.config = config;
  }

  async stat(_storagePath, _storageType = this.config.provider) {
    throw new Error('StorageAdapter.stat is not implemented');
  }

  async readStream(_storagePath, _storageType = this.config.provider) {
    throw new Error('StorageAdapter.readStream is not implemented');
  }

  async writeStream(_destinationPath, _readableStream, _options = {}) {
    throw new Error('StorageAdapter.writeStream is not implemented');
  }

  async delete(_storagePath, _storageType = this.config.provider) {
    throw new Error('StorageAdapter.delete is not implemented');
  }

  publicUrl(_storagePath) {
    throw new Error('StorageAdapter.publicUrl is not implemented');
  }
}

class LocalStorageAdapter extends StorageAdapter {
  async stat(storagePath, storageType = 'local') {
    if (storageType !== 'local' || !isLocalStorage()) {
      return { exists: null, path: null, size: 0, storageType };
    }

    const resolved = resolveStoragePath(storagePath);
    if (!resolved) {
      return { exists: false, path: null, size: 0, storageType };
    }

    try {
      const stat = await fs.stat(resolved);
      if (!stat.isFile()) return { exists: false, path: resolved, size: 0, storageType };
      return { exists: true, path: resolved, size: stat.size, storageType };
    } catch {
      return { exists: false, path: resolved, size: 0, storageType };
    }
  }

  async readStream(storagePath, storageType = 'local') {
    if (storageType !== 'local') throw new Error('Local adapter can only read local storage paths');
    const resolved = resolveStoragePath(storagePath);
    if (!resolved) throw new Error('Storage path is outside allowed roots');
    const fsSync = await import('fs');
    return fsSync.createReadStream(resolved);
  }

  async delete(storagePath, storageType = 'local') {
    if (storageType !== 'local') return { deleted: false, reason: 'external-storage' };
    const resolved = resolveStoragePath(storagePath);
    if (!resolved) return { deleted: false, reason: 'outside-allowed-roots' };
    await fs.unlink(resolved);
    return { deleted: true, path: resolved };
  }

  publicUrl(storagePath) {
    if (!resolveStoragePath(storagePath)) return null;
    const portable = toStoragePath(storagePath);
    const uploads = portable.startsWith('uploads/');
    const prefix = uploads ? this.config.uploadsPublicPath : this.config.dataPublicPath;
    return `${prefix.replace(/\/$/, '')}/${portable.slice(portable.indexOf('/') + 1)}`;
  }
}

class PlaceholderObjectStorageAdapter extends StorageAdapter {
  async stat(_storagePath, storageType = this.config.provider) {
    return { exists: null, path: null, size: 0, storageType };
  }

  publicUrl(storagePath) {
    if (!storagePath || !this.config.objectBaseUrl) return null;
    return `${this.config.objectBaseUrl.replace(/\/$/, '')}/${storagePath.replace(/^\//, '')}`;
  }
}

export const storageAdapter = storageConfig.provider === 'local'
  ? new LocalStorageAdapter(storageConfig)
  : new PlaceholderObjectStorageAdapter(storageConfig);

export function getStorageReport() {
  return {
    provider: storageConfig.provider,
    uploadsRoot: storageConfig.uploadsRoot,
    dataRoot: storageConfig.dataRoot,
    uploadsPublicPath: storageConfig.uploadsPublicPath,
    dataPublicPath: storageConfig.dataPublicPath,
    objectBucketConfigured: Boolean(storageConfig.objectBucket),
    objectBaseUrlConfigured: Boolean(storageConfig.objectBaseUrl),
    adapterReady: storageConfig.provider === 'local',
    requiredAdapterMethods: ['stat', 'readStream', 'writeStream', 'delete', 'publicUrl']
  };
}

export function isLocalStorage() {
  return storageConfig.provider === 'local';
}

export function isAllowedLocalPath(candidate) {
  return typeof candidate === 'string' && path.isAbsolute(candidate) &&
    [storageConfig.uploadsRoot, storageConfig.dataRoot].some(root => isWithinRoot(root, candidate));
}

function isWithinRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function resolveStoragePath(storagePath) {
  if (typeof storagePath !== 'string' || !storagePath || storagePath.includes('\0')) return null;
  const normalized = storagePath.replace(/\\/g, '/');
  if (path.isAbsolute(normalized) && isAllowedLocalPath(normalized)) return path.resolve(normalized);

  // Old default absolute paths remain portable after moving the storage roots.
  const roots = [
    [path.join(backendRoot, 'uploads'), storageConfig.uploadsRoot],
    [path.join(projectRoot, 'data'), storageConfig.dataRoot]
  ];
  if (path.isAbsolute(normalized)) {
    for (const [legacyRoot, root] of roots) {
      if (isWithinRoot(legacyRoot, normalized)) return path.join(root, path.relative(legacyRoot, normalized));
    }
  }

  const namespaces = [
    ['uploads', storageConfig.uploadsRoot],
    ['data', storageConfig.dataRoot],
    ['../data', storageConfig.dataRoot],
    [storageConfig.uploadsPublicPath.replace(/^\/|\/$/g, ''), storageConfig.uploadsRoot],
    [storageConfig.dataPublicPath.replace(/^\/|\/$/g, ''), storageConfig.dataRoot]
  ];
  const value = normalized.replace(/^\//, '');
  for (const [prefix, root] of namespaces) {
    if (!prefix) continue;
    if (value !== prefix && !value.startsWith(`${prefix}/`)) continue;
    const relative = value.slice(prefix.length).replace(/^\//, '');
    if (relative.split('/').includes('..')) return null;
    const resolved = path.resolve(root, relative);
    return isWithinRoot(root, resolved) ? resolved : null;
  }
  return null;
}

export function toStoragePath(storagePath) {
  const resolved = resolveStoragePath(storagePath);
  if (!resolved) throw new Error('Storage path is outside allowed roots');
  const roots = [['uploads', storageConfig.uploadsRoot], ['data', storageConfig.dataRoot]]
    .sort((a, b) => b[1].length - a[1].length);
  for (const [prefix, root] of roots) {
    if (isWithinRoot(root, resolved)) return `${prefix}/${path.relative(root, resolved).split(path.sep).join('/')}`;
  }
}

export async function statStoragePath(storagePath, storageType = 'local') {
  return storageAdapter.stat(storagePath, storageType);
}

export async function directoryStats(root) {
  let totalBytes = 0;
  let fileCount = 0;

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });

    await Promise.all(entries.map(async entry => {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        return;
      }
      if (entry.isFile()) {
        const stat = await fs.stat(entryPath);
        totalBytes += stat.size;
        fileCount += 1;
      }
    }));
  }

  await walk(root);
  return { path: root, fileCount, totalBytes };
}

export async function ensureLocalStorageRoots() {
  if (!isLocalStorage()) return;
  await fs.mkdir(storageConfig.uploadsRoot, { recursive: true });
  await fs.mkdir(storageConfig.dataRoot, { recursive: true });
}
