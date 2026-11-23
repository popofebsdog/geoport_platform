/**
 * Create an initial admin user.
 * Usage: node backend/database/seed_admin.js [username] [email] [--reset]
 * Password: ADMIN_PASSWORD or ADMIN_PASSWORD_FILE (no default or CLI password).
 */
import bcrypt from 'bcryptjs';
import { Sequelize, DataTypes } from 'sequelize';
import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env') });

let database;
try {
  const args = process.argv.slice(2);
  const positional = args.filter(arg => !arg.startsWith('-'));
  if (positional.length > 2 || args.some(arg => arg.startsWith('-') && arg !== '--reset')) {
    console.error('Usage: seed_admin.js [username] [email] [--reset]. Use ADMIN_PASSWORD or ADMIN_PASSWORD_FILE, never a password argument.');
    process.exitCode = 1;
  } else {
    const [username = 'admin', email = 'admin@geoport.local'] = positional;
    const forceReset = args.includes('--reset');
    const primaryDatabaseName = process.env.DB_NAME || 'geoport_db';
    const databaseName = process.env.NODE_ENV === 'test'
      ? process.env.DB_NAME_TEST || 'geoport_test'
      : primaryDatabaseName;
    if (process.env.NODE_ENV === 'test' && databaseName === primaryDatabaseName) {
      throw new Error('Test database must differ from the primary database');
    }
    const { ADMIN_PASSWORD, ADMIN_PASSWORD_FILE } = process.env;
    if (ADMIN_PASSWORD && ADMIN_PASSWORD_FILE) {
      throw new Error('Conflicting password sources');
    }
    const password = ADMIN_PASSWORD_FILE
      ? (await readFile(ADMIN_PASSWORD_FILE, 'utf8')).replace(/\r?\n$/, '')
      : ADMIN_PASSWORD;
    const placeholders = new Set(['admin1234', 'password', 'replace-with-strong-password', 'your-admin-password']);
    if (!password?.trim() || Buffer.byteLength(password, 'utf8') > 72 ||
        (process.env.NODE_ENV === 'production' &&
          (password.length < 12 || placeholders.has(password)))) {
      console.error('Set ADMIN_PASSWORD or ADMIN_PASSWORD_FILE to a nonempty password (maximum 72 UTF-8 bytes; production requires at least 12 characters and no default/placeholder).');
      process.exitCode = 1;
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      database = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: databaseName,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        logging: false,
        dialectOptions: {
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false
        }
      });
      // Only map seed fields; never sync or alter the migration-managed users table.
      const User = database.define('SeedAdmin', {
        user_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        username: { type: DataTypes.STRING, unique: true },
        email: { type: DataTypes.STRING, unique: true },
        display_name: DataTypes.STRING,
        password_hash: DataTypes.STRING,
        role: DataTypes.STRING,
        is_active: DataTypes.BOOLEAN,
        is_verified: DataTypes.BOOLEAN
      }, { tableName: 'users', timestamps: false });
      const [user, created] = await User.findOrCreate({
        where: { username },
        defaults: {
          email, display_name: username, password_hash: passwordHash,
          role: 'admin', is_active: true, is_verified: true
        }
      });
      if (!created && forceReset) {
        await user.update({ password_hash: passwordHash, role: 'admin', is_active: true });
      }
      console.log(created ? 'Admin user created.' : forceReset
        ? 'Admin user reset.' : 'Admin user already exists, skipped. Use --reset to reset.');
    }
  }
} catch {
  // Driver and filesystem errors can contain credentials; never print their details.
  console.error('Admin setup failed. Check password source and database configuration.');
  process.exitCode = 1;
} finally {
  if (database) {
    try {
      await database.close();
    } catch {
      console.error('Admin setup failed to close the database connection.');
      process.exitCode = 1;
    }
  }
}
