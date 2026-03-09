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
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 子專案 CRUD
router.get('/', getAllChildProjects);
router.get('/:id', getChildProjectById);
router.put('/:id', authenticate, updateChildProject);
router.delete('/:id', authenticate, deleteChildProject);

export default router;

