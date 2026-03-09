import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// GET / — list available endpoints
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '認證 API',
    endpoints: [
      'POST /api/auth/login - 用戶登入',
      'POST /api/auth/register - 用戶註冊',
      'POST /api/auth/logout - 用戶登出',
      'GET /api/auth/profile - 獲取用戶資料'
    ]
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '請提供帳號與密碼' });
    }

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

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = NOW(), last_activity_at = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    const token = JWT_SECRET
      ? jwt.sign(
          { userId: user.user_id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        )
      : 'dev-no-secret';

    return res.json({
      success: true,
      message: '登入成功',
      token,
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
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, display_name } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: '請提供帳號、Email 與密碼' });
    }

    const exists = await pool.query(
      'SELECT user_id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: '帳號或 Email 已被使用' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, email, display_name, password_hash, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, 'editor', TRUE, TRUE)
       RETURNING user_id, username, email, display_name, role`,
      [username, email, display_name || username, password_hash]
    );

    const user = result.rows[0];
    const token = JWT_SECRET
      ? jwt.sign(
          { userId: user.user_id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        )
      : 'dev-no-secret';

    return res.status(201).json({
      success: true,
      message: '註冊成功',
      token,
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
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: '已登出' });
});

// GET /api/auth/users  (admin only)
router.get('/users', authenticate, async (req, res) => {
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
});

// PUT /api/auth/users/:id  — toggle active / change role (admin only)
router.put('/users/:id', authenticate, async (req, res) => {
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
});

// GET /api/auth/profile
router.get('/profile', authenticate, async (req, res) => {
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
});

export default router;
