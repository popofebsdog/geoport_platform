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