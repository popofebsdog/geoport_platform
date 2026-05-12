/**
 * 子專案路由
 * 處理子專案（時間週期）相關的 API 請求
 */

import express from 'express';
import {
  getAllChildProjects,
  getChildProjectById,
  updateChildProject,
  deleteChildProject
} from '../controllers/childProjectController.js';
import {
  upload,
  getChildProjectMedia,
  uploadChildProjectMedia,
  deleteChildProjectMedia
} from '../controllers/childProjectMediaController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 子專案 CRUD
router.get('/', getAllChildProjects);
router.get('/:id', getChildProjectById);
router.put('/:id', authenticate, updateChildProject);
router.delete('/:id', authenticate, deleteChildProject);

// 子專案影像紀錄（照片／影片）
router.get('/:projectId/media', authenticate, getChildProjectMedia);
router.post('/:projectId/media', authenticate, upload.array('file', 20), uploadChildProjectMedia);
router.delete('/:projectId/media/:mediaId', authenticate, deleteChildProjectMedia);

export default router;

