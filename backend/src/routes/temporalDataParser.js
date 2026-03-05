import express from 'express';
import { parseCSVForCharting, getAvailableColumns } from '../controllers/temporalDataParserController.js';

const router = express.Router();

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
