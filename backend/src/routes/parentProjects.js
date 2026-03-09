/**
 * 母專案路由
 * 處理母專案（地點）相關的 API 請求
 */

import express from 'express';
import {
  getAllParentProjects,
  getParentProjectById,
  createParentProject,
  updateParentProject,
  deleteParentProject
} from '../controllers/parentProjectController.js';
import {
  getChildProjectsByParent,
  createChildProject
} from '../controllers/childProjectController.js';
import {
  getReportLinks,
  createReportLink,
  updateReportLink,
  deleteReportLink
} from '../controllers/projectReportLinkController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 母專案 CRUD
router.get('/', getAllParentProjects);
router.get('/:id', getParentProjectById);
router.post('/', authenticate, createParentProject);
router.put('/:id', authenticate, updateParentProject);
router.delete('/:id', authenticate, deleteParentProject);

// 子專案管理（在母專案路由下）
router.get('/:parentId/children', getChildProjectsByParent);
router.post('/:parentId/children', authenticate, createChildProject);

// 報告連結管理
router.get('/:id/report-links', getReportLinks);
router.post('/:id/report-links', authenticate, createReportLink);
router.put('/:id/report-links/:linkId', authenticate, updateReportLink);
router.delete('/:id/report-links/:linkId', authenticate, deleteReportLink);

export default router;

