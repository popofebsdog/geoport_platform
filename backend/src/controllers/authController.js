import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User } from '../models/User.js';
import { signToken } from '../services/authTokenService.js';
import { validateUUID } from '../utils/validators.js';
import { createLogger } from '../utils/logger.js';

const audit = createLogger('audit');
function rejectLogin(res, status, message, reason, targetUserId = null) {
  audit.warn('Login rejected', { action: 'auth.login', outcome: 'denied', reason, targetUserId });
  return res.status(status).json({ success: false, message });
}

const userFields = ['user_id', 'username', 'email', 'display_name', 'role', 'is_active', 'is_verified', 'created_at', 'last_login_at'];
const accountDetails = user => Object.fromEntries(userFields.map(field => [field, user[field]]));

// ── 驗證工具 ──────────────────────────────────────────────
function validateUsername(username) {
  if (!username || typeof username !== 'string') return '帳號不得為空';
  if (username.length < 3 || username.length > 50) return '帳號長度需在 3~50 字元之間';
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return '帳號僅能使用英數字、底線或連字號';
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return '密碼不得為空';
  if (password.length < 8) return '密碼至少需要 8 個字元';
  if (Buffer.byteLength(password, 'utf8') > 72) return '密碼不得超過 72 個 UTF-8 位元組';
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email 不得為空';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Email 格式不正確';
  return null;
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

  if (display_name && (typeof display_name !== 'string' || display_name.length < 2 || display_name.length > 100)) {
    return { error: { status: 400, message: '顯示名稱需在 2~100 字元之間' } };
  }
  const exists = await User.findOne({ where: { [Op.or]: [{ username }, { email }] }, paranoid: false });
  if (exists) {
    return { error: { status: 409, message: '帳號或 Email 已被使用' } };
  }

  const password_hash = await bcrypt.hash(password, 12);
  const user = await User.create({ username, email, display_name: display_name || username,
    password_hash, role, is_active: true, is_verified: true });
  return { user };
}

// ── Controllers ───────────────────────────────────────────
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || !username || username.length > 255) {
      return rejectLogin(res, 400, '請輸入有效的帳號或 Email', 'invalid_input');
    }
    // Existing bcrypt accounts may use passwords longer than its 72-byte input limit.
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return rejectLogin(res, 400, '請輸入 8~128 字元的密碼', 'invalid_input');
    }

    const user = await User.findOne({ where: { [Op.or]: [{ username }, { email: username }] } });
    if (!user) {
      return rejectLogin(res, 401, '帳號或密碼錯誤', 'invalid_credentials');
    }

    if (!user.is_active) {
      return rejectLogin(res, 403, '帳號已停用，請聯絡管理員', 'inactive_account', user.user_id);
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return rejectLogin(res, 401, '帳號或密碼錯誤', 'invalid_credentials', user.user_id);
    }

    await user.update({ last_login_at: new Date(), last_activity_at: new Date() });
    audit.info('Login succeeded', { action: 'auth.login', outcome: 'success', targetUserId: user.user_id });

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
    audit.error('Login failed', { action: 'auth.login', outcome: 'error', error: err });
    return res.status(500).json({ success: false, message: '伺服器錯誤，請稍後再試' });
  }
}

export async function createUserByAdmin(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: '僅限管理員存取' });
    }

    const { username, email, password, display_name, role = 'editor' } = req.body;
    const { user, error } = await createUserRecord({ username, email, password, display_name, role });
    if (error) return res.status(error.status).json({ success: false, message: error.message });
    audit.info('Account created', { action: 'auth.user_created', outcome: 'success', targetUserId: user.user_id, assignedRole: user.role });

    return res.status(201).json({
      success: true,
      message: '使用者已建立',
      user: accountDetails(user)
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: '帳號或 Email 已被使用' });
    console.error('Admin create user error:', err);
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
}

export async function getUsers(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: '僅限管理員存取' });
    }
    const users = await User.findAll({ attributes: userFields, order: [['created_at', 'DESC']] });
    return res.json({ success: true, users });
  } catch (err) {
    console.error('Get users error:', err);
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
}

export async function updateUser(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: '僅限管理員存取' });
    }
    const { id } = req.params;
    if (!validateUUID(id, res)) return;
    const { is_active, role, password } = req.body;
    const changes = {};
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') return res.status(400).json({ success: false, message: '帳號狀態必須是布林值' });
      changes.is_active = is_active;
    }
    if (role !== undefined) {
      if (!['admin', 'editor', 'viewer'].includes(role)) return res.status(400).json({ success: false, message: '角色不正確' });
      changes.role = role;
    }
    if (password) {
      const passwordErr = validatePassword(password);
      if (passwordErr) return res.status(400).json({ success: false, message: passwordErr });
      const hash = await bcrypt.hash(password, 12);
      changes.password_hash = hash;
    }

    if (!Object.keys(changes).length) return res.status(400).json({ success: false, message: '沒有可更新的欄位' });
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: '找不到用戶' });
    await user.update(changes);
    audit.info('Account updated', { action: 'auth.user_updated', outcome: 'success', targetUserId: user.user_id,
      changedFields: Object.keys(changes), assignedRole: user.role, isActive: user.is_active });
    return res.json({ success: true, user: accountDetails(user) });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
}

export async function getProfile(req, res) {
  try {
    const user = await User.findByPk(req.user?.userId, { attributes: userFields });
    if (!user) {
      return res.status(404).json({ success: false, message: '找不到用戶' });
    }
    return res.json({ success: true, user: accountDetails(user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
}
