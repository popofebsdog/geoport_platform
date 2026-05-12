import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { login, register, getUsers, updateUser, getProfile, createUserByAdmin } from '../controllers/authController.js';

const router = express.Router();

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

router.post('/login', login);
router.post('/register', register);
router.post('/logout', (req, res) => res.json({ success: true, message: '已登出' }));
router.get('/users', authenticate, getUsers);
router.post('/users', authenticate, createUserByAdmin);
router.put('/users/:id', authenticate, updateUser);
router.get('/profile', authenticate, getProfile);

export default router;
