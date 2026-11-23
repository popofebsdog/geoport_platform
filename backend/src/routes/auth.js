import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { login, getUsers, updateUser, getProfile, createUserByAdmin } from '../controllers/authController.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { loginRateLimit } from '../middleware/loginRateLimit.js';
import { ASSET_COOKIE, assetCookieOptions } from '../middleware/privateDataAccess.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '認證 API',
    endpoints: [
      'POST /api/auth/login - 用戶登入',
      'POST /api/auth/logout - 用戶登出',
      'GET /api/auth/profile - 獲取用戶資料'
    ]
  });
});

router.post('/login', loginRateLimit, login);
router.post('/logout', (req, res) => {
  res.clearCookie(ASSET_COOKIE, assetCookieOptions());
  res.json({ success: true, message: '已登出' });
});
router.get('/users', authenticate, requireAdmin, getUsers);
router.post('/users', authenticate, requireAdmin, createUserByAdmin);
router.put('/users/:id', authenticate, requireAdmin, updateUser);
router.get('/profile', authenticate, getProfile);

export default router;
