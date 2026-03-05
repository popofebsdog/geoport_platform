import express from 'express';
import { 
  generateApexChartConfig, 
  getChartPreview 
} from '../controllers/temporalDataChartController.js';

const router = express.Router();

/**
 * 時序資料圖表生成路由
 * 用於生成 ApexCharts 配置
 */

// 生成 ApexCharts 配置 JSON
// POST /api/temporal-data/:temporalId/chart/apex
router.post('/:temporalId/chart/apex', generateApexChartConfig);

// 獲取圖表預覽資訊
// GET /api/temporal-data/:temporalId/chart/preview
router.get('/:temporalId/chart/preview', getChartPreview);

export default router;
