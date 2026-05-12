import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { pool } from '../config/database.js';
import { directoryStats, getStorageReport, isLocalStorage, storageConfig } from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationRoot = path.resolve(__dirname, '..', '..', 'database', 'migrations');

function formatBytes(size) {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let next = value / 1024;
  let unit = units.shift();
  while (next >= 1024 && units.length) {
    next /= 1024;
    unit = units.shift();
  }
  return `${next.toFixed(next >= 10 ? 1 : 2)} ${unit}`;
}

export async function checkTitilerHealth() {
  const url = process.env.TITILER_INTERNAL_URL || process.env.TITILER_URL || 'http://localhost:8080';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  const started = Date.now();

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/healthz`, { signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    return {
      status: response.ok ? 'ok' : 'error',
      url,
      latencyMs: Date.now() - started,
      version: body?.versions?.titiler || null
    };
  } catch (error) {
    return {
      status: 'error',
      url,
      latencyMs: Date.now() - started,
      message: error.name === 'AbortError' ? 'TiTiler health check timeout' : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkDatabase() {
  const started = Date.now();
  await pool.query('SELECT 1');
  const coreTables = ['projects', 'data_files', 'spatial_layers', 'users'];
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY($1)
  `, [coreTables]);
  const existing = result.rows.map(row => row.table_name);
  const missing = coreTables.filter(table => !existing.includes(table));
  return {
    status: missing.length ? 'warning' : 'ok',
    latencyMs: Date.now() - started,
    coreTables: { expected: coreTables.length, existing: existing.length, missing }
  };
}

async function checkStorage() {
  const report = getStorageReport();
  if (!isLocalStorage()) {
    return {
      status: report.adapterReady ? 'ok' : 'warning',
      provider: report.provider,
      message: 'Object storage provider configured; runtime adapter is not implemented yet.',
      adapterReady: report.adapterReady
    };
  }

  const [uploads, data] = await Promise.all([
    directoryStats(storageConfig.uploadsRoot),
    directoryStats(storageConfig.dataRoot)
  ]);

  return {
    status: 'ok',
    provider: report.provider,
    adapterReady: true,
    uploads: { ...uploads, label: formatBytes(uploads.totalBytes) },
    data: { ...data, label: formatBytes(data.totalBytes) }
  };
}

async function checkMigrations() {
  const files = (await fs.readdir(migrationRoot))
    .filter(file => file.endsWith('.sql'))
    .sort();
  const trackedTable = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'schema_migrations'
    ) AS exists
  `);

  if (!trackedTable.rows[0]?.exists) {
    return {
      status: 'warning',
      migrationFiles: files.length,
      latestMigration: files[files.length - 1] || null,
      trackedInDatabase: false,
      appliedCount: 0,
      pendingCount: files.length,
      pending: files.slice(-10),
      message: 'schema_migrations 尚未建立，無法確認 DB 實際套用版本。'
    };
  }

  const appliedResult = await pool.query(`
    SELECT version, checksum, applied_at
    FROM schema_migrations
    ORDER BY version ASC
  `);
  const applied = appliedResult.rows;
  const appliedVersions = new Set(applied.map(row => row.version));
  const pending = files.filter(file => !appliedVersions.has(file));
  const checksumMismatches = [];

  for (const row of applied) {
    if (!files.includes(row.version) || !row.checksum) continue;
    const content = await fs.readFile(path.join(migrationRoot, row.version));
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    if (checksum !== row.checksum) {
      checksumMismatches.push(row.version);
    }
  }

  const coreTables = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  const status = checksumMismatches.length > 0 || pending.length > 0 || Number(coreTables.rows[0]?.count || 0) === 0
    ? 'warning'
    : 'ok';

  return {
    status,
    migrationFiles: files.length,
    latestMigration: files[files.length - 1] || null,
    trackedInDatabase: true,
    appliedCount: applied.length,
    latestApplied: applied[applied.length - 1]?.version || null,
    pendingCount: pending.length,
    pending: pending.slice(0, 20),
    checksumMismatches,
    message: pending.length
      ? `${pending.length} migration file(s) not recorded in schema_migrations.`
      : checksumMismatches.length
        ? `${checksumMismatches.length} applied migration checksum mismatch(es).`
        : 'Migration tracking is up to date.'
  };
}

export async function getDeepHealth() {
  const started = Date.now();
  const [database, titiler, storage, migrations] = await Promise.allSettled([
    checkDatabase(),
    checkTitilerHealth(),
    checkStorage(),
    checkMigrations()
  ]);

  const components = {
    database: database.status === 'fulfilled' ? database.value : { status: 'error', message: database.reason.message },
    titiler: titiler.status === 'fulfilled' ? titiler.value : { status: 'error', message: titiler.reason.message },
    storage: storage.status === 'fulfilled' ? storage.value : { status: 'error', message: storage.reason.message },
    migrations: migrations.status === 'fulfilled' ? migrations.value : { status: 'error', message: migrations.reason.message }
  };

  const statuses = Object.values(components).map(component => component.status);
  const status = statuses.includes('error') ? 'error' : statuses.includes('warning') ? 'warning' : 'ok';

  return {
    status,
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    environment: process.env.NODE_ENV || 'development',
    components
  };
}
