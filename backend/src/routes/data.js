import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  uploadData, 
  getProjectData, 
  getDataById, 
  updateData, 
  deleteData, 
  downloadFile,
  getProjectGeoJSON,
  getProjectGeoJSONList,
  getPotentialAnalysisIntervals,
  uploadToFeature,
  getFeatureUploads,
  deleteFeatureUpload,
  upload,
  featureUpload,
  getProjectBaseMaps
} from '../controllers/dataController.js';

const router = express.Router();

// 上傳資料 (需要檔案上傳)
router.post('/upload', authenticate, upload.single('file'), uploadData);

// 獲取專案的資料列表
router.get('/project/:projectId', getProjectData);

// 獲取專案的所有 GeoJSON 資料列表
router.get('/project/:projectId/geojson-list', getProjectGeoJSONList);

// 獲取專案的底圖列表
router.get('/project/:projectId/basemaps', getProjectBaseMaps);

// 獲取專案的 GeoJSON 資料
router.get('/project/:projectId/geojson', getProjectGeoJSON);

// 獲取潛勢評估的區間設定
router.get('/potential-analysis/:fileId/intervals', getPotentialAnalysisIntervals);

// 獲取單一資料
router.get('/:id', getDataById);

// 更新資料
router.put('/:id', authenticate, updateData);

// 軟刪除資料
router.delete('/:id', authenticate, deleteData);

// 下載檔案
router.get('/:id/download', downloadFile);

// 關聯上傳到 GeoJSON feature
router.post('/feature/upload', authenticate, featureUpload.single('file'), uploadToFeature);

// 獲取 feature 的關聯上傳資料
router.get('/feature/:dataFilesId/:featureId', getFeatureUploads);

// 刪除關聯上傳資料
router.delete('/feature/:uploadId', authenticate, deleteFeatureUpload);


// API 資訊
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '數據管理 API',
    endpoints: [
      'POST /api/data/upload - 上傳資料檔案',
      'GET /api/data/project/:projectId - 獲取專案的資料列表',
      'GET /api/data/project/:projectId/geojson - 獲取專案的 GeoJSON 資料',
      'GET /api/data/project/:projectId/geojson-list - 獲取專案的所有 GeoJSON 資料列表',
      'GET /api/data/project/:projectId/basemaps - 獲取專案的底圖列表',
      'GET /api/data/potential-analysis/:fileId/intervals - 獲取潛勢評估的區間設定',
      'GET /api/data/:id - 獲取特定資料',
      'PUT /api/data/:id - 更新資料',
      'DELETE /api/data/:id - 刪除資料',
      'GET /api/data/:id/download - 下載檔案',
      'POST /api/data/feature/upload - 關聯上傳到 GeoJSON feature',
      'GET /api/data/feature/:dataFilesId/:featureId - 獲取 feature 的關聯上傳資料',
      'DELETE /api/data/feature/:uploadId - 刪除關聯上傳資料'
    ]
  });
});

export default router;
