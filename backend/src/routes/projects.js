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
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 項目路由
router.get('/', getAllProjects);
router.get('/deleted', getDeletedProjects);
router.get('/:id', getProjectById);
router.post('/', authenticate, createProject);
router.put('/:id', authenticate, updateProject);
router.delete('/:id', authenticate, deleteProject);
router.patch('/:id/bookmark', authenticate, toggleBookmark);
router.patch('/:id/restore', authenticate, restoreProject);

export default router;
