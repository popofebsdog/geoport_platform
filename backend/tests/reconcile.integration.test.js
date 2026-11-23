import { test, expect, beforeAll, afterAll } from '@jest/globals';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Sequelize } from 'sequelize';

const socket = process.env.GEOPORT_TEST_PG_SOCKET;
const integration = socket ? test : test.skip;
const root = fileURLToPath(new URL('../', import.meta.url));
const referenceName = `geoport_reconcile_${process.pid}`;
let referenceDb;
let expected;
let tools;
let number = 0;
const settings = { dialect: 'postgres', host: socket, port: 55439, logging: false };
const admin = () => new Sequelize('postgres', 'geoport_audit', 'test-only-unused-password', settings);

beforeAll(async () => {
  if (!socket) return;
  expect(existsSync(`${root}/database/reconcile_legacy_migrations.js`)).toBe(true);
  tools = await import('../database/reconcile_legacy_migrations.js');
  const result = spawnSync('bash', [`${root}/database/deploy.sh`], {
    env: { ...process.env, DB_HOST: socket, DB_PORT: '55439', DB_USER: 'geoport_audit',
      DB_NAME: referenceName, DB_PASSWORD: 'test-only-unused-password', LC_ALL: 'C' },
    encoding: 'utf8', timeout: 60000
  });
  expect(result.status).toBe(0);
  referenceDb = new Sequelize(referenceName, 'geoport_audit', 'test-only-unused-password', settings);
  expected = await tools.captureSchemaEvidence(referenceDb);
  await referenceDb.close();
  referenceDb = undefined;
}, 60000);

afterAll(async () => {
  if (referenceDb) await referenceDb.close();
  if (socket) {
    const db = admin();
    try { await db.query(`DROP DATABASE IF EXISTS ${referenceName}`); } finally { await db.close(); }
  }
});

async function scenario(run) {
  const name = `${referenceName}_${++number}`;
  const db = admin();
  let source;
  try {
    await db.query(`CREATE DATABASE ${name} TEMPLATE ${referenceName}`);
    source = new Sequelize(name, 'geoport_audit', 'test-only-unused-password', settings);
    for (const [version, checksum] of Object.entries(tools.LEGACY_CHECKSUMS)) {
      await source.query('UPDATE schema_migrations SET checksum=$1 WHERE version=$2', { bind: [checksum, version] });
    }
    await source.query("DELETE FROM schema_migrations WHERE version IN ('014a_prepare_temporal_data_enhanced.sql', '042_repair_legacy_search_indexes.sql')");
    await source.query('DROP INDEX idx_data_files_fulltext; DROP INDEX idx_spatial_layers_fulltext; DROP INDEX idx_data_files_recent; DROP INDEX idx_users_recent_login; DROP FUNCTION search_text_array(text[])');
    const evidence = { restoreVerified: true, databaseSha256: 'a'.repeat(64), data: await tools.captureDataFingerprints(source) };
    await run(source, evidence);
  } finally {
    if (source) await source.close();
    await db.query(`DROP DATABASE IF EXISTS ${name}`);
    await db.close();
  }
}

integration('verified upgrade repairs actual objects, preserves all rows and journals old checksums', async () => {
  await scenario(async (db, backup) => {
    const before = await tools.captureDataFingerprints(db);
    const result = await tools.reconcileLegacyMigrations(db, { reference: [expected], backup });
    expect(result.reconciled).toHaveLength(4);
    expect(await tools.captureDataFingerprints(db)).toEqual(before);
    expect(await tools.captureSchemaEvidence(db)).toEqual(expected);
    const [audit] = await db.query('SELECT * FROM schema_migration_reconciliations');
    expect(audit).toHaveLength(4);
    expect(audit.every(row => row.backup_sha256 === backup.databaseSha256 && row.previous_checksum !== row.new_checksum)).toBe(true);
    const second = await tools.reconcileLegacyMigrations(db, { reference: expected, backup });
    expect(second.reconciled).toEqual([]);
  });
});

integration('unknown checksum is rejected before changing rows or migration history', async () => {
  await scenario(async (db, backup) => {
    await db.query("UPDATE schema_migrations SET checksum=$1 WHERE version='001_create_projects_table.sql'", { bind: ['f'.repeat(64)] });
    await expect(tools.reconcileLegacyMigrations(db, { reference: expected, backup })).rejects.toThrow(/checksum/);
    const [rows] = await db.query("SELECT checksum FROM schema_migrations WHERE version='001_create_projects_table.sql'");
    expect(rows[0].checksum).toBe('f'.repeat(64));
  });
});

integration('schema disagreement rolls back additive repairs and all ledger changes', async () => {
  await scenario(async (db, backup) => {
    await db.query('CREATE INDEX idx_data_files_recent ON data_files(file_size)');
    await expect(tools.reconcileLegacyMigrations(db, { reference: expected, backup })).rejects.toThrow(/schema/i);
    const [rows] = await db.query("SELECT checksum FROM schema_migrations WHERE version='005_create_foreign_keys_and_indexes.sql'");
    expect(rows[0].checksum).toBe(tools.LEGACY_CHECKSUMS['005_create_foreign_keys_and_indexes.sql']);
    const [functions] = await db.query("SELECT to_regprocedure('search_text_array(text[])') AS function");
    expect(functions[0].function).toBeNull();
  });
});

integration('missing restore proof or changed backup data prevents the upgrade', async () => {
  await scenario(async (db, backup) => {
    await expect(tools.reconcileLegacyMigrations(db, { reference: expected, backup: { ...backup, restoreVerified: false } })).rejects.toThrow(/backup/i);
    await expect(tools.reconcileLegacyMigrations(db, { reference: expected, backup: { ...backup, data: {} } })).rejects.toThrow(/backup/i);
  });
});

integration('existing temporal coordinates with the wrong type cannot be marked complete', async () => {
  await scenario(async (db, backup) => {
    await db.query('ALTER TABLE temporal_data ALTER COLUMN longitude TYPE INTEGER USING longitude::integer');
    await expect(tools.reconcileLegacyMigrations(db, { reference: expected, backup })).rejects.toThrow(/schema/i);
    const [rows] = await db.query("SELECT count(*)::int AS count FROM schema_migrations WHERE version='014a_prepare_temporal_data_enhanced.sql'");
    expect(rows[0].count).toBe(0);
  });
});

integration('unbounded numeric coordinates stay unbounded and retain their data', async () => {
  await scenario(async (db, backup) => {
    await db.query('ALTER TABLE temporal_data ALTER COLUMN longitude TYPE NUMERIC');
    await tools.reconcileLegacyMigrations(db, { reference: expected, backup });
    const schema = await tools.captureSchemaEvidence(db);
    expect(schema.coordinates.find(column => column.name === 'longitude').precision).toBeNull();
    expect(await tools.captureDataFingerprints(db)).toEqual(backup.data);
  });
});
