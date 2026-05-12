import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  upload,
  uploadTemporalData,
  getTemporalDataList,
  getTemporalDataById,
  updateTemporalData,
  deleteTemporalData,
  parseAndGenerateChart,
  downloadTemporalDataJson,
  getChartData
} from '../controllers/temporalDataEnhancedController.js';

const router = express.Router();

/**
 * 增強版時序資料路由
 * 用於管理 CSV 時序資料的完整生命週期
 */

// 上傳時序資料
// POST /api/temporal-data-enhanced/:projectId/upload
router.post('/:projectId/upload', authenticate, upload.single('file'), uploadTemporalData);

// 獲取專案的時序資料列表
// GET /api/temporal-data-enhanced/:projectId/list
router.get('/:projectId/list', authenticate, getTemporalDataList);

// 獲取圖表數據 (必須在 /:temporalId 之前)
// GET /api/temporal-data-enhanced/:temporalId/chart
router.get('/:temporalId/chart', authenticate, getChartData);

// 下載時序資料 JSON 檔案 (必須在 /:temporalId 之前)
// GET /api/temporal-data-enhanced/:temporalId/json
router.get('/:temporalId/json', authenticate, downloadTemporalDataJson);

// 解析並生成圖表資料 (必須在 /:temporalId 之前)
// POST /api/temporal-data-enhanced/:temporalId/parse
router.post('/:temporalId/parse', authenticate, parseAndGenerateChart);

// 獲取時序資料詳情 (通用路由，放在最後)
// GET /api/temporal-data-enhanced/:temporalId
router.get('/:temporalId', authenticate, getTemporalDataById);

// 更新時序資料
// PUT /api/temporal-data-enhanced/:temporalId
router.put('/:temporalId', authenticate, updateTemporalData);

// 刪除時序資料
// DELETE /api/temporal-data-enhanced/:temporalId
router.delete('/:temporalId', authenticate, deleteTemporalData);

export default router;
