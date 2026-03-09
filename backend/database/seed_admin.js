/**
 * Create an initial admin user.
 * Usage: node backend/database/seed_admin.js [username] [email] [password]
 * Defaults: admin / admin@geoport.local / admin1234
 */
import bcrypt from 'bcryptjs';
import pkg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env') });

const { Pool } = pkg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'geoport_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const forceReset = process.argv.includes('--reset');
const [username = 'admin', email = 'admin@geoport.local', password = 'admin1234'] = args;

(async () => {
  const hash = await bcrypt.hash(password, 12);
  try {
    const conflict = forceReset
      ? `ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin', is_active = TRUE`
      : `ON CONFLICT (username) DO NOTHING`;

    const res = await pool.query(
      `INSERT INTO users (username, email, display_name, password_hash, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, 'admin', TRUE, TRUE)
       ${conflict}
       RETURNING username, email, role`,
      [username, email, username, hash]
    );
    if (res.rows.length > 0) {
      const action = forceReset ? '重設' : '建立';
      console.log(`✅ Admin user ${action}:`, res.rows[0]);
      console.log(`   帳號: ${username}  密碼: ${password}`);
    } else {
      console.log(`ℹ️  Admin user "${username}" already exists, skipped. (使用 --reset 強制重設密碼)`);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
