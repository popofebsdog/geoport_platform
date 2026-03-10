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

/**
 * @swagger
 * /api/disaster-points:
 *   get:
 *     tags: [DisasterPoints]
 *     summary: List disaster points
 *     description: List disaster points.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Disaster points returned }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 *   post:
 *     tags: [DisasterPoints]
 *     summary: Create disaster point
 *     description: Create disaster point with optional media upload.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               media_files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201: { description: Created }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 * /api/disaster-points/{id}:
 *   get:
 *     tags: [DisasterPoints]
 *     summary: Get disaster point
 *     description: Get disaster point by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Disaster point returned }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   put:
 *     tags: [DisasterPoints]
 *     summary: Update disaster point
 *     description: Update disaster point by ID.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   delete:
 *     tags: [DisasterPoints]
 *     summary: Delete disaster point
 *     description: Delete disaster point by ID.
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
 */

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
