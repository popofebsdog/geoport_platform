import express from 'express';
import {
  upload,
  getTemporalDataList,
  uploadTemporalData,
  getTemporalDataById,
  updateTemporalData,
  deleteTemporalData,
  getTemporalDataChart
} from '../controllers/temporalDataController.js';

const router = express.Router();

/**
 * @swagger
 * /api/projects/{projectId}/temporal-data:
 *   get:
 *     tags: [TemporalData]
 *     summary: List temporal data for project
 *     description: List temporal data entries for a project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Temporal data list returned }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 *   post:
 *     tags: [TemporalData]
 *     summary: Create temporal data
 *     description: Create temporal data for project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201: { description: Created }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 * /api/temporal-data/{temporalId}:
 *   get:
 *     tags: [TemporalData]
 *     summary: Get temporal data by ID
 *     description: Get temporal data detail.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: temporalId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Temporal data returned }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   put:
 *     tags: [TemporalData]
 *     summary: Update temporal data
 *     description: Update temporal data by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: temporalId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   delete:
 *     tags: [TemporalData]
 *     summary: Delete temporal data
 *     description: Delete temporal data by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: temporalId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 */

// 獲取專案的時序資料列表
router.get('/projects/:projectId/temporal-data', getTemporalDataList);

// 獲取單個時序資料詳情
router.get('/temporal-data/:temporalId', getTemporalDataById);

// 上傳時序資料
router.post('/projects/:projectId/temporal-data/upload', upload.single('file'), uploadTemporalData);

// 更新時序資料
router.put('/temporal-data/:temporalId', updateTemporalData);

// 刪除時序資料
router.delete('/temporal-data/:temporalId', deleteTemporalData);

// 獲取時序資料的圖表數據
router.get('/temporal-data/:temporalId/chart', getTemporalDataChart);

export default router;
