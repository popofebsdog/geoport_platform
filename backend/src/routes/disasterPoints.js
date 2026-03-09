/**
 * 災點紀錄路由
 * 處理災點紀錄相關的 API 請求
 */

import express from 'express';
import {
  getDisasterPointsByProject,
  getDisasterPointById,
  createDisasterPoint,
  updateDisasterPoint,
  deleteDisasterPoint,
  deleteDisasterPointMedia,
  upload
} from '../controllers/disasterPointController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 獲取專案的所有災點紀錄
router.get('/project/:projectId', getDisasterPointsByProject);

// 獲取單個災點紀錄
router.get('/:id', getDisasterPointById);

// 創建災點紀錄（支援多媒體文件上傳）
router.post('/', authenticate, upload.array('media_files', 10), createDisasterPoint);

// 更新災點紀錄 (支援多檔案上傳)
router.put('/:id', authenticate, upload.array('media_files'), updateDisasterPoint);

// 刪除災點紀錄
router.delete('/:id', authenticate, deleteDisasterPoint);

// 刪除災點的照片/影片
router.delete('/:disasterPointId/media/:mediaId', authenticate, deleteDisasterPointMedia);

export default router;

