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

/**
 * @swagger
 * /api/reports:
 *   get:
 *     tags: [Reports]
 *     summary: List reports
 *     description: List all reports.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Reports returned }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 *   post:
 *     tags: [Reports]
 *     summary: Create report
 *     description: Create a report.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               projectId: { type: string }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 * /api/reports/{id}:
 *   get:
 *     tags: [Reports]
 *     summary: Get report
 *     description: Get report by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Report returned }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   put:
 *     tags: [Reports]
 *     summary: Update report
 *     description: Update report by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   delete:
 *     tags: [Reports]
 *     summary: Delete report
 *     description: Delete report by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 * /api/reports/{id}/download:
 *   get:
 *     tags: [Reports]
 *     summary: Download report
 *     description: Download report file by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: File stream returned }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 */

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
