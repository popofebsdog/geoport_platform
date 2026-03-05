import express from 'express';

const router = express.Router();

// 認證路由
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '認證 API',
    endpoints: [
      'POST /api/auth/login - 用戶登入',
      'POST /api/auth/register - 用戶註冊',
      'POST /api/auth/logout - 用戶登出',
      'GET /api/auth/profile - 獲取用戶資料',
      'PUT /api/auth/profile - 更新用戶資料'
    ]
  });
});

export default router;
