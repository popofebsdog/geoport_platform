import express from 'express';
import { parseCSVForCharting, getAvailableColumns } from '../controllers/temporalDataParserController.js';

const router = express.Router();

/**
 * @swagger
 * /api/temporal-data/parse:
 *   post:
 *     tags: [TemporalData]
 *     summary: Parse temporal data file
 *     description: Parse uploaded temporal data file to structured chartable data.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: Parsed successfully }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 */

/**
 * 時序資料解析路由
 * 用於解析 CSV 檔案並生成適合作圖的 JSON 資料
 */

// 解析 CSV 檔案並提取圖表資料
// POST /api/temporal-data/:temporalId/parse
router.post('/:temporalId/parse', parseCSVForCharting);

// 獲取可用欄位
// GET /api/temporal-data/:temporalId/columns
router.get('/:temporalId/columns', getAvailableColumns);

export default router;
