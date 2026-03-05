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

const router = express.Router();

// 報告路由
router.get('/', getAllReports);                    // 獲取所有報告
router.get('/deleted', getDeletedReports);         // 獲取已刪除報告
router.get('/:id', getReportById);                 // 獲取單個報告
router.post('/', createReport);                    // 創建報告
router.put('/:id', updateReport);                  // 更新報告
router.delete('/:id', deleteReport);               // 刪除報告
router.patch('/:id/bookmark', toggleBookmark);     // 切換書籤狀態
router.patch('/:id/restore', restoreReport);       // 還原報告

export default router;
