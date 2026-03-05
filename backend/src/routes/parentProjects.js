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

const router = express.Router();

// 母專案 CRUD
router.get('/', getAllParentProjects);
router.get('/:id', getParentProjectById);
router.post('/', createParentProject);
router.put('/:id', updateParentProject);
router.delete('/:id', deleteParentProject);

// 子專案管理（在母專案路由下）
router.get('/:parentId/children', getChildProjectsByParent);
router.post('/:parentId/children', createChildProject);

// 報告連結管理
router.get('/:id/report-links', getReportLinks);
router.post('/:id/report-links', createReportLink);
router.put('/:id/report-links/:linkId', updateReportLink);
router.delete('/:id/report-links/:linkId', deleteReportLink);

export default router;

