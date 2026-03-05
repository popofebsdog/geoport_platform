import express from 'express';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  toggleBookmark,
  getDeletedProjects,
  restoreProject
} from '../controllers/projectController.js';

const router = express.Router();

// 項目路由
router.get('/', getAllProjects);           // 獲取所有項目
router.get('/deleted', getDeletedProjects); // 獲取已刪除項目
router.get('/:id', getProjectById);        // 獲取單個項目
router.post('/', createProject);           // 創建項目
router.put('/:id', updateProject);         // 更新項目
router.delete('/:id', deleteProject);      // 刪除項目
router.patch('/:id/bookmark', toggleBookmark); // 切換書籤
router.patch('/:id/restore', restoreProject);  // 還原項目

export default router;
