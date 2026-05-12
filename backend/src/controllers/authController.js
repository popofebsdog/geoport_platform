import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const ALLOW_PUBLIC_REGISTRATION = process.env.ALLOW_PUBLIC_REGISTRATION === 'true';

// ── 驗證工具 ──────────────────────────────────────────────
function validateUsername(username) {
  if (!username || typeof username !== 'string') return '帳號不得為空';
  if (username.length < 3 || username.length > 50) return '帳號長度需在 3~50 字元之間';
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return '密碼不得為空';
  if (password.length < 8) return '密碼至少需要 8 個字元';
  if (password.length > 128) return '密碼過長';
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email 不得為空';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Email 格式不正確';
  return null;
}

function signToken(user) {
  if (!JWT_SECRET) return 'dev-no-secret';
  return jwt.sign(
    { userId: user.user_id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function createUserRecord({ username, email, password, display_name, role = 'editor' }) {
  const usernameErr = validateUsername(username);
  if (usernameErr) return { error: { status: 400, message: usernameErr } };
  const emailErr = validateEmail(email);
  if (emailErr) return { error: { status: 400, message: emailErr } };
  const passwordErr = validatePassword(password);
  if (passwordErr) return { error: { status: 400, message: passwordErr } };

  const allowedRoles = new Set(['admin', 'editor', 'viewer']);
  if (!allowedRoles.has(role)) {
    return { error: { status: 400, message: '角色不正確' } };
  }

  const exists = await pool.query(
    'SELECT user_id FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );
  if (exists.rows.length > 0) {
    return { error: { status: 409, message: '帳號或 Email 已被使用' } };
  }

  const password_hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (username, email, display_name, password_hash, role, is_active, is_verified)
     VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
     RETURNING user_id, username, email, display_name, role, is_active, is_verified, created_at`,
    [username, email, display_name || username, password_hash, role]
  );

  return { user: result.rows[0] };
}

// ── Controllers ───────────────────────────────────────────
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    const usernameErr = validateUsername(username);
    if (usernameErr) return res.status(400).json({ success: false, message: usernameErr });
    const passwordErr = validatePassword(password);
    if (passwordErr) return res.status(400).json({ success: false, message: passwordErr });

    const result = await pool.query(
      `SELECT user_id, username, email, display_name, role, password_hash, is_active
       FROM users WHERE (username = $1 OR email = $1) AND deleted_at IS NULL LIMIT 1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: '帳號已停用，請聯絡管理員' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
    }

    await pool.query(
      'UPDATE users SET last_login_at = NOW(), last_activity_at = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    return res.json({
      success: true,
      message: '登入成功',
      token: signToken(user),
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        displayName: user.display_name || user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: '伺服器錯誤，請稍後再試' });
  }
}

export async function register(req, res) {
  try {
    if (process.env.NODE_ENV === 'production' && !ALLOW_PUBLIC_REGISTRATION) {
      return res.status(403).json({ success: false, message: '正式環境不開放公開註冊，請由管理員建立帳號' });
    }

    const { username, email, password, display_name } = req.body;
    const { user, error } = await createUserRecord({ username, email, password, display_name, role: 'editor' });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    return res.status(201).json({
      success: true,
      message: '註冊成功',
      token: signToken(user),
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: '伺服器錯誤，請稍後再試' });
  }
}

export async function createUserByAdmin(req, res) {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '僅限管理員存取' });
    }

    const { username, email, password, display_name, role = 'editor' } = req.body;
    const { user, error } = await createUserRecord({ username, email, password, display_name, role });
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    return res.status(201).json({
      success: true,
      message: '使用者已建立',
      user
    });
  } catch (err) {
    console.error('Admin create user error:', err);
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
}

export async function getUsers(req, res) {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '僅限管理員存取' });
    }
    const result = await pool.query(
      `SELECT user_id, username, email, display_name, role, is_active, is_verified,
              created_at, last_login_at
       FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );
    return res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error('Get users error:', err);
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
}

export async function updateUser(req, res) {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '僅限管理員存取' });
    }
    const { id } = req.params;
    const { is_active, role, password } = req.body;
    const fields = [];
    const values = [];

    if (is_active !== undefined) { fields.push(`is_active = $${fields.length + 1}`); values.push(is_active); }
    if (role !== undefined)      { fields.push(`role = $${fields.length + 1}`);      values.push(role); }
    if (password) {
      const passwordErr = validatePassword(password);
      if (passwordErr) return res.status(400).json({ success: false, message: passwordErr });
      const hash = await bcrypt.hash(password, 12);
      fields.push(`password_hash = $${fields.length + 1}`);
      values.push(hash);
    }

    if (fields.length === 0) return res.status(400).json({ success: false, message: '沒有可更新的欄位' });
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
       WHERE user_id = $${values.length} AND deleted_at IS NULL
       RETURNING user_id, username, email, role, is_active`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: '找不到用戶' });
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
}

export async function getProfile(req, res) {
  try {
    const result = await pool.query(
      'SELECT user_id, username, email, display_name, role FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到用戶' });
    }
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
}
