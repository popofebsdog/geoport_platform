import { test, expect, afterAll } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sequelize, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { gzipSync } from 'node:zlib';

// Only use a separately started, temporary PostgreSQL cluster over its Unix socket.
const socket = process.env.GEOPORT_TEST_PG_SOCKET;
const integration = socket ? test : test.skip;
const root = fileURLToPath(new URL('../', import.meta.url));
const database = `geoport_checks_${process.pid}`;
const env = {
  ...process.env, DB_HOST: socket, DB_PORT: '55439', DB_USER: 'geoport_audit',
  DB_NAME: database, DB_PASSWORD: 'test-only-unused-password', DB_SSL: 'false',
  NODE_ENV: 'production', ADMIN_PASSWORD: 'test-only-admin-password-7!',
  LC_ALL: 'C', LC_CTYPE: 'C', LANG: 'C'
};
delete env.ADMIN_PASSWORD_FILE;
const temporary = [];
let connection;

function sql(args, db = database) {
  return spawnSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-h', socket,
    '-p', '55439', '-U', 'geoport_audit', '-d', db, ...args], { encoding: 'utf8' });
}

afterAll(async () => {
  if (connection) await connection.close();
  if (socket) sql(['-c', `DROP DATABASE IF EXISTS ${database}`], 'postgres');
  for (const directory of temporary) rmSync(directory, { recursive: true, force: true });
});

integration('initialization supports a custom database name with PostGIS', () => {
  const create = sql(['-c', `CREATE DATABASE ${database}`], 'postgres');
  expect(create.status).toBe(0);
  const init = sql(['-f', path.join(root, 'database/init.sql')]);
  expect(init.stderr).not.toMatch(/ERROR|database .* does not exist/);
  expect(init.status).toBe(0);
});

integration('historical full-text indexes work without an optional Chinese parser', () => {
  for (const query of [
    "SELECT to_tsvector('chinese', 'Taiwan road monitoring') @@ plainto_tsquery('chinese', 'monitoring')",
    "SELECT to_tsvector('chinese', '\u908a\u5761\u76e3\u6e2c') @@ plainto_tsquery('chinese', '\u908a\u5761\u76e3\u6e2c')"
  ]) {
    const result = sql(['-tAc', query]);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('t');
  }
});

integration('initialization preserves a pre-existing custom search configuration', () => {
  expect(sql(['-c', 'ALTER TEXT SEARCH CONFIGURATION public.chinese ALTER MAPPING FOR asciiword WITH english_stem']).status).toBe(0);
  expect(sql(['-f', path.join(root, 'database/init.sql')]).status).toBe(0);
  const result = sql(['-tAc', "SELECT to_tsvector('chinese', 'running') @@ to_tsquery('simple', 'run')"]);
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe('t');
});

integration('a fresh database completes every migration and can rerun without changes', async () => {
  const name = `${database}_fresh`;
  const restored = `${database}_restored`;
  let fresh;
  try {
    const deploy = () => spawnSync('bash', [path.join(root, 'database/deploy.sh')], {
      env: { ...env, DB_NAME: name }, encoding: 'utf8', input: 'n\n', timeout: 60000
    });
    let result = deploy();
    expect(result.stderr).not.toMatch(/ERROR:/);
    expect(result.status).toBe(0);
    const applied = sql(['-tAc', "SELECT json_agg(json_build_object('version', version, 'checksum', checksum)) FROM schema_migrations"], name);
    expect(applied.status).toBe(0);
    const files = readdirSync(path.join(root, 'database/migrations')).filter(file => file.endsWith('.sql'));
    const versions = JSON.parse(applied.stdout);
    expect(versions).toHaveLength(files.length);
    for (const version of versions) {
      const content = readFileSync(path.join(root, 'database/migrations', version.version));
      expect(version.checksum).toBe(createHash('sha256').update(content).digest('hex'));
    }
    expect(sql(['-tAc', 'SELECT count(*) FROM projects'], name).stdout.trim()).toBe('0');
    expect(sql(['-tAc', 'SELECT count(*) FROM image_records'], name).stdout.trim()).toBe('0');
    expect(sql(['-tAc', 'SELECT count(*) FROM project_statistics'], name).status).toBe(0);
    fresh = new Sequelize(name, env.DB_USER, env.DB_PASSWORD, {
      dialect: 'postgres', host: socket, port: 55439, logging: false
    });
    const Project = fresh.define('ProjectSmoke', {
      project_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: DataTypes.STRING, temporal_data_count: DataTypes.INTEGER
    }, { tableName: 'projects', timestamps: false });
    const common = {
      temporal_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      project_id: DataTypes.UUID, name: DataTypes.STRING, data_type: DataTypes.STRING,
      longitude: DataTypes.DECIMAL(10, 7), latitude: DataTypes.DECIMAL(10, 7)
    };
    const Temporal = fresh.define('TemporalSmoke', {
      ...common, start_time: DataTypes.DATE, end_time: DataTypes.DATE, data_format: DataTypes.STRING
    }, { tableName: 'temporal_data', timestamps: false });
    const Enhanced = fresh.define('EnhancedSmoke', {
      ...common, x_axis_columns: DataTypes.ARRAY(DataTypes.TEXT), y_axis_columns: DataTypes.ARRAY(DataTypes.TEXT)
    }, { tableName: 'temporal_data_enhanced', timestamps: false });
    const project = await Project.create({ name: 'Migration contract smoke test' });
    const temporal = await Temporal.create({ project_id: project.project_id, name: 'GNSS smoke',
      data_type: 'gnss', start_time: '2026-01-01', end_time: '2026-01-02', data_format: 'csv',
      longitude: 121.4, latitude: 24.6 });
    const enhanced = await Enhanced.create({ project_id: project.project_id, name: 'CSV smoke',
      data_type: 'csv', longitude: 121.4, latitude: 24.6,
      x_axis_columns: ['time'], y_axis_columns: ['value'] });
    await project.reload();
    expect(project.temporal_data_count).toBe(2);
    await temporal.destroy();
    await enhanced.destroy();
    await project.reload();
    expect(project.temporal_data_count).toBe(0);
    const unchanged = sql(['-tAc', "SELECT md5(to_jsonb(p)::text) FROM projects p ORDER BY project_id"], name).stdout;
    expect(sql(['-f', path.join(root, 'database/migrations/014a_prepare_temporal_data_enhanced.sql')], name).status).toBe(0);
    expect(sql(['-tAc', "SELECT md5(to_jsonb(p)::text) FROM projects p ORDER BY project_id"], name).stdout).toBe(unchanged);
    result = deploy();
    expect(result.stderr).not.toMatch(/ERROR:/);
    expect(result.status).toBe(0);
    expect(await Project.count()).toBe(1);
    const backups = mkdtempSync(path.join(tmpdir(), 'geoport-real-backup-'));
    temporary.push(backups);
    const uploads = path.join(backups, 'uploads'), data = path.join(backups, 'data');
    mkdirSync(uploads); mkdirSync(data);
    writeFileSync(path.join(uploads, 'fixture.txt'), 'upload round trip');
    writeFileSync(path.join(data, 'fixture.txt'), 'map round trip');
    const backup = spawnSync('bash', [path.join(root, 'scripts/backup-bundle.sh')], {
      env: { ...env, DB_NAME: name, BACKUP_ROOT: backups, BACKUP_WRITES_QUIESCED: 'true',
        UPLOADS_ROOT: uploads, DATA_ROOT: data }, encoding: 'utf8', timeout: 30000
    });
    expect(backup.status).toBe(0);
    const bundles = readdirSync(backups).filter(file => file.startsWith('geoport_bundle_'));
    expect(bundles).toHaveLength(1);
    const bundle = path.join(backups, bundles[0]);
    const { verifyBackup } = await import('../scripts/verify-backup.js');
    expect((await verifyBackup(bundle)).verified).toBe(true);
    for (const [archive, expected] of [['uploads', 'upload round trip'], ['data', 'map round trip']]) {
      const target = path.join(backups, `restored-${archive}`); mkdirSync(target);
      expect(spawnSync('tar', ['-xzf', path.join(bundle, `${archive}.tar.gz`), '-C', target]).status).toBe(0);
      expect(readFileSync(path.join(target, 'fixture.txt'), 'utf8')).toBe(expected);
    }
    expect(sql(['-c', `CREATE DATABASE ${restored}`], 'postgres').status).toBe(0);
    const restore = spawnSync('bash', [path.join(root, 'database/manage.sh'), 'restore'], {
      env: { ...env, DB_NAME: restored, BACKUP_ROOT: bundle }, encoding: 'utf8', input: '1\ny\n', timeout: 30000
    });
    expect(restore.stderr).not.toMatch(/ERROR:/);
    expect(restore.status).toBe(0);
    expect(sql(['-tAc', 'SELECT count(*) FROM projects'], restored).stdout.trim()).toBe('1');
    expect(Number(sql(['-tAc', 'SELECT count(*) FROM schema_migrations'], restored).stdout.trim())).toBe(files.length);
    const failedBackup = path.join(backups, 'failure-case'); mkdirSync(failedBackup);
    writeFileSync(path.join(failedBackup, 'broken.sql.gz'), gzipSync('DELETE FROM projects; SELECT * FROM intentionally_missing_restore_table;'));
    const failedRestore = spawnSync('bash', [path.join(root, 'database/manage.sh'), 'restore'], {
      env: { ...env, DB_NAME: restored, BACKUP_ROOT: failedBackup }, encoding: 'utf8', input: '1\ny\n', timeout: 30000
    });
    expect(failedRestore.status).not.toBe(0);
    expect(failedRestore.stdout).not.toContain('還原完成');
    expect(sql(['-tAc', 'SELECT count(*) FROM projects'], restored).stdout.trim()).toBe('1');
  } finally {
    if (fresh) await fresh.close();
    sql(['-c', `DROP DATABASE IF EXISTS ${name}`], 'postgres');
    sql(['-c', `DROP DATABASE IF EXISTS ${restored}`], 'postgres');
  }
}, 90000);

integration('SQL failures stop migration without recording it as applied', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'geoport-migration-check-'));
  temporary.push(directory);
  cpSync(path.join(root, 'database/deploy.sh'), path.join(directory, 'deploy.sh'));
  mkdirSync(path.join(directory, 'migrations'));
  writeFileSync(path.join(directory, 'init.sql'), 'SELECT 1;');
  cpSync(path.join(root, 'database/migrations/000_create_schema_migrations.sql'),
    path.join(directory, 'migrations/000_create_schema_migrations.sql'));
  writeFileSync(path.join(directory, 'migrations/999_failure.sql'),
    'CREATE TABLE partial_migration_probe (id integer); SELECT * FROM intentionally_missing_migration_table;');
  const deploy = spawnSync('bash', [path.join(directory, 'deploy.sh')], {
    env, encoding: 'utf8', input: 'n\nn\n', timeout: 15000
  });
  expect(deploy.status).not.toBe(0);
  expect(deploy.stderr).toContain('intentionally_missing_migration_table');
  const applied = sql(['-tAc', "SELECT count(*) FROM schema_migrations WHERE version = '999_failure.sql'"]);
  expect(applied.status).toBe(0);
  expect(applied.stdout.trim()).toBe('0');
  const partial = sql(['-tAc', "SELECT to_regclass('public.partial_migration_probe') IS NULL"]);
  expect(partial.status).toBe(0);
  expect(partial.stdout.trim()).toBe('t');
  expect(deploy.stdout).not.toContain(env.DB_PASSWORD);
});

integration('admin creation, safe rerun and explicit reset work on PostgreSQL', async () => {
  connection = new Sequelize(database, env.DB_USER, env.DB_PASSWORD, {
    dialect: 'postgres', host: socket, port: 55439, logging: false
  });
  const User = connection.define('User', {
    user_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    username: { type: DataTypes.STRING, unique: true },
    email: { type: DataTypes.STRING, unique: true }, display_name: DataTypes.STRING,
    password_hash: DataTypes.STRING, role: DataTypes.STRING,
    is_active: DataTypes.BOOLEAN, is_verified: DataTypes.BOOLEAN
  }, { tableName: 'users', timestamps: false });
  await User.sync();
  const seed = (args = [], password = env.ADMIN_PASSWORD) => {
    const result = spawnSync(process.execPath, [path.join(root, 'database/seed_admin.js'), ...args], {
      env: { ...env, ADMIN_PASSWORD: password }, encoding: 'utf8', timeout: 15000
    });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).not.toContain(password);
    return result;
  };
  seed();
  let admin = await User.findOne({ where: { username: 'admin' } });
  expect(admin.role).toBe('admin');
  expect(await bcrypt.compare(env.ADMIN_PASSWORD, admin.password_hash)).toBe(true);
  const resetPassword = 'test-only-replacement-password-8!';
  seed([], resetPassword);
  await admin.reload();
  expect(await bcrypt.compare(env.ADMIN_PASSWORD, admin.password_hash)).toBe(true);
  seed(['--reset'], resetPassword);
  await admin.reload();
  expect(await bcrypt.compare(resetPassword, admin.password_hash)).toBe(true);
  expect(await bcrypt.compare(env.ADMIN_PASSWORD, admin.password_hash)).toBe(false);
}, 30000);
