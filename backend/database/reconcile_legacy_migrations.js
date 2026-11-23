import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { DataTypes } from 'sequelize';

const root = fileURLToPath(new URL('./migrations/', import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
const migrations = () => new Map(readdirSync(root).filter(name => name.endsWith('.sql')).sort()
  .map(name => [name, { content: readFileSync(`${root}${name}`, 'utf8'), checksum: digest(readFileSync(`${root}${name}`)) }]));

// Known pre-repair files, verified against the original repository and migration ledger.
export const LEGACY_CHECKSUMS = {
  '001_create_projects_table.sql': 'bf60858a742dc0eb945c8679b9bd96c892cea7fc035e9af4a3fdca743136022d',
  '005_create_foreign_keys_and_indexes.sql': '8db552dff68a8278a21d0a2e5ed64dc24896b459a2a42d0fa3f774b8a45f219b',
  '021_insert_test_disaster_points.sql': '58e0d2382500b38dfd6e5289aa9476232f5b8b857d7de13157b4e20d91605a7d',
  '022_insert_test_image_records.sql': 'efe51d23fbc49c598c1bb56547920ecb403280263ada476bc007238d30f92d49'
};
const pendingAllowed = ['014a_prepare_temporal_data_enhanced.sql', '042_repair_legacy_search_indexes.sql'];
const bookkeeping = ['schema_migrations', 'schema_migration_reconciliations'];

export async function captureDataFingerprints(db, transaction) {
  if (!transaction) return db.transaction({ isolationLevel: 'REPEATABLE READ' }, current => captureDataFingerprints(db, current));
  await db.query("SET LOCAL TIME ZONE 'UTC'", { transaction });
  const tables = (await db.getQueryInterface().showAllTables({ transaction })).filter(name => !bookkeeping.includes(name)).sort();
  const result = {};
  for (const name of tables) {
    const table = db.getQueryInterface().queryGenerator.quoteIdentifier(name);
    const [rows] = await db.query(`SELECT COUNT(*)::text AS rows,
      encode(sha256(convert_to(COALESCE(string_agg(row_hash, '' ORDER BY row_hash), ''), 'UTF8')), 'hex') AS sha256
      FROM (SELECT encode(sha256(convert_to(to_jsonb(t)::text, 'UTF8')), 'hex') AS row_hash FROM public.${table} t) source`, { transaction });
    result[name] = rows[0];
  }
  return result;
}

export async function captureSchemaEvidence(db, transaction) {
  const files = migrations();
  const source = ['001_create_projects_table.sql', '005_create_foreign_keys_and_indexes.sql'].map(name => files.get(name).content).join('\n');
  const indexes = [...new Set([...source.matchAll(/CREATE INDEX IF NOT EXISTS (\w+)/g)].map(match => match[1]))];
  const functions = [...new Set([...source.matchAll(/CREATE OR REPLACE FUNCTION (\w+)/g)].map(match => match[1]))];
  const query = async (sql, names) => (await db.query(sql, { bind: [names], transaction }))[0];
  return {
    columns: await db.getQueryInterface().describeTable('projects', { transaction }),
    coordinates: await query(`SELECT column_name AS name, data_type AS type, numeric_precision AS precision,
      numeric_scale AS scale, is_nullable='YES' AS nullable
      FROM information_schema.columns WHERE table_schema='public' AND table_name='temporal_data'
      AND column_name=ANY($1) ORDER BY column_name`, ['longitude', 'latitude']),
    indexes: await query(`SELECT c.relname AS name, pg_get_indexdef(c.oid) AS definition, i.indisvalid AS valid, i.indisready AS ready
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_index i ON i.indexrelid=c.oid
      WHERE n.nspname='public' AND c.relname=ANY($1) ORDER BY c.relname`, indexes),
    functions: await query(`SELECT p.proname AS name, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=ANY($1) ORDER BY p.proname`, functions),
    views: await query(`SELECT c.relname AS name, pg_get_viewdef(c.oid,true) AS definition
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='v' AND c.relname=ANY($1) ORDER BY c.relname`, ['active_projects', 'project_statistics']),
    constraints: await query(`SELECT conname AS name, pg_get_constraintdef(oid) AS definition, convalidated AS valid
      FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname=ANY($1) ORDER BY conname`, ['fk_projects_owner_id', 'fk_data_files_uploader_id']),
    triggers: await query(`SELECT tgname AS name, pg_get_triggerdef(oid) AS definition, tgenabled AS enabled
      FROM pg_trigger WHERE tgrelid='public.projects'::regclass AND tgname=ANY($1) ORDER BY tgname`, ['trigger_projects_updated_at', 'trigger_projects_soft_delete'])
  };
}

function matchesReference(actual, expected) {
  const { coordinates, ...schema } = actual;
  const { coordinates: required, ...reference } = expected;
  if (!required || !coordinates || coordinates.length !== required.length) return false;
  const valid = coordinates.every((column, index) => {
    const target = required[index];
    // Unconstrained/wider NUMERIC already preserves the required coordinate precision; do not narrow user data.
    return column.name === target.name && column.type === 'numeric' && column.nullable === target.nullable &&
      (column.precision === null || (column.scale >= target.scale && column.precision - column.scale >= target.precision - target.scale));
  });
  return valid && isDeepStrictEqual(schema, reference);
}

export async function reconcileLegacyMigrations(db, { reference, backup }) {
  assert(backup?.restoreVerified && /^[a-f0-9]{64}$/.test(backup.databaseSha256), 'A restored, verified backup is required');
  const references = Array.isArray(reference) ? reference : [reference];
  assert(references.length && references.every(item => item?.indexes?.length && item?.views?.length), 'A fresh reference schema is required');
  const files = migrations();
  const Ledger = db.define('VerifiedMigration', {
    version: { type: DataTypes.STRING, primaryKey: true }, checksum: DataTypes.STRING, applied_at: DataTypes.DATE
  }, { tableName: 'schema_migrations', timestamps: false });
  const Audit = db.define('MigrationReconciliation', {
    version: { type: DataTypes.STRING, primaryKey: true },
    previous_checksum: { type: DataTypes.STRING, primaryKey: true },
    new_checksum: { type: DataTypes.STRING, primaryKey: true },
    reason: DataTypes.TEXT, backup_sha256: DataTypes.STRING, schema_sha256: DataTypes.STRING
  }, { tableName: 'schema_migration_reconciliations', timestamps: false });

  return db.transaction(async transaction => {
    await db.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='60s'; SET LOCAL TIME ZONE 'UTC'", { transaction });
    const tables = (await db.getQueryInterface().showAllTables({ transaction })).sort();
    const identifiers = tables.map(name => `public.${db.getQueryInterface().queryGenerator.quoteIdentifier(name)}`);
    await db.query(`LOCK TABLE ${identifiers.join(', ')} IN SHARE ROW EXCLUSIVE MODE`, { transaction });
    const before = await captureDataFingerprints(db, transaction);
    assert.deepEqual(before, backup.data, 'Current data differs from the verified backup');
    const records = await Ledger.findAll({ raw: true, transaction });
    const applied = new Map(records.map(row => [row.version, row]));
    const pending = [...files.keys()].filter(name => !applied.has(name));
    assert(pending.every(name => pendingAllowed.includes(name)), 'Unexpected pending migration');
    const changed = records.filter(row => files.has(row.version) && files.get(row.version).checksum !== row.checksum);
    for (const row of changed) assert.equal(row.checksum, LEGACY_CHECKSUMS[row.version], `Unrecognized checksum: ${row.version}`);

    for (const name of pending) {
      await db.query(files.get(name).content, { transaction });
      await Ledger.create({ version: name, checksum: files.get(name).checksum, applied_at: new Date() }, { transaction });
    }
    const schema = await captureSchemaEvidence(db, transaction);
    assert(references.some(expected => matchesReference(schema, expected)), 'Actual schema does not match the verified fresh schema');
    assert.deepEqual(await captureDataFingerprints(db, transaction), before, 'Business data changed during migration');
    for (const row of changed) {
      const reason = row.version.startsWith('021') || row.version.startsWith('022')
        ? 'Demonstration seed retired; existing data retained, not replayed or declared equivalent.'
        : 'Additive legacy repair completed; schema verified against fresh migrations and business data unchanged.';
      await Audit.create({ version: row.version, previous_checksum: row.checksum, new_checksum: files.get(row.version).checksum,
        reason, backup_sha256: backup.databaseSha256, schema_sha256: digest(JSON.stringify(schema)) }, { transaction });
      const [updated] = await Ledger.update({ checksum: files.get(row.version).checksum }, {
        where: { version: row.version, checksum: row.checksum }, transaction
      });
      assert.equal(updated, 1, 'Migration history changed concurrently');
    }
    return { applied: pending, reconciled: changed.map(row => row.version), data: before, schema };
  });
}
