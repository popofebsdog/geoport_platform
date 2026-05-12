import express from 'express';
import {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  toggleBookmark,
  getDeletedReports,
  restoreReport
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 報告路由
router.get('/', getAllReports);
router.get('/deleted', getDeletedReports);
router.get('/:id', getReportById);
router.post('/', authenticate, createReport);
router.put('/:id', authenticate, updateReport);
router.delete('/:id', authenticate, deleteReport);
router.patch('/:id/bookmark', authenticate, toggleBookmark);
router.patch('/:id/restore', authenticate, restoreReport);

export default router;
