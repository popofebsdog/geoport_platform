import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { createMulterFileFilter, createStoredFilename, maxUploadSize, sanitizeOriginalName } from '../config/uploadPolicy.js';
import {
  getWarningRegions,
  getWarningRegionByCode,
  getWarningRegionData,
  getWarningRegionDataById,
  upsertWarningRegionData,
  createRegionProject,
  updateRegionProject,
  getPointColors,
  getPointColorsById,
  upsertPointColor,
  upsertPointColorById,
  importInspectionRecordFromExcel,
  getInspectionRecords,
  getInspectionRecordsById,
  createInspectionRecord,
  updateInspectionRecord,
  deleteInspectionRecord,
  deleteRegionProject,
  getAlertLights,
  getAlertLightsById,
  createAlertLight,
  deleteAlertLight,
  deleteAlertLightById,
  getDisasterCountsByMileage,
  getDisasterCountsByMileageById,
  getRegionLayers,
  getRegionLayersById,
  upsertRegionLayer,
  deleteRegionLayer,
  serveMonitoringFile
} from '../controllers/warningRegionController.js';

const router = express.Router();

// 獲取所有預警地區列表
router.get('/', getWarningRegions);

// 代理服務：取得監測圖資實際內容（必須在 /:regionCode 之前，避免被攔截）
router.get('/monitoring-file', serveMonitoringFile);

// 根據地區代碼獲取地區資訊
router.get('/:regionCode', getWarningRegionByCode);

// 獲取指定地區的數據（使用 region_code，向后兼容）
router.get('/:regionCode/data', getWarningRegionData);

// 獲取指定地區的數據（使用 region_id）
router.get('/id/:regionId/data', getWarningRegionDataById);

// 創建或更新預警地區數據
router.post('/:regionCode/data', authenticate, upsertWarningRegionData);

// 建立地區專案（包含上傳檔案）
const upload = multer({
  dest: 'uploads/warning-regions/',
  limits: { fileSize: maxUploadSize('dataFile') },
  fileFilter: createMulterFileFilter('dataFile')
});
router.post('/create-project', authenticate, upload.array('files'), createRegionProject);

// 更新地區專案（使用 region_id）
router.put('/id/:regionId', authenticate, updateRegionProject);

// 刪除地區專案（使用 region_id）
router.delete('/id/:regionId', authenticate, deleteRegionProject);

// 獲取地區點位顏色配置（使用 region_id）- 必須在 /:regionCode 路由之前
router.get('/id/:regionId/point-colors', getPointColorsById);

// 獲取地區點位顏色配置（使用 region_code，向后兼容）
router.get('/:regionCode/point-colors', getPointColors);

// 更新或創建點位顏色配置（使用 region_id）- 必須在 /:regionCode 路由之前
router.post('/id/:regionId/point-colors', authenticate, upsertPointColorById);

// 更新或創建點位顏色配置（使用 region_code，向后兼容）
router.post('/:regionCode/point-colors', authenticate, upsertPointColor);

// 導入 Excel 巡查紀錄（僅第一筆數據）
router.post('/:regionCode/import-inspection', authenticate, importInspectionRecordFromExcel);

// 獲取指定地區的巡查紀錄（使用 region_id）- 必須在 /:regionCode 路由之前
router.get('/id/:regionId/inspection-records', getInspectionRecordsById);

// 獲取指定地區的巡查紀錄（使用 region_code，向后兼容）
router.get('/:regionCode/inspection-records', getInspectionRecords);

// 創建巡查紀錄
router.post('/:regionCode/inspection-records', authenticate, createInspectionRecord);

// 更新巡查紀錄
router.put('/:regionCode/inspection-records/:recordId', authenticate, updateInspectionRecord);

// 刪除巡查紀錄
router.delete('/:regionCode/inspection-records/:recordId', authenticate, deleteInspectionRecord);

// 獲取指定地區的告警燈號位置列表（使用 region_id）- 必須在 /:regionCode 路由之前
router.get('/id/:regionId/alert-lights', getAlertLightsById);

// 獲取指定地區的告警燈號位置列表（使用 region_code，向后兼容）
router.get('/:regionCode/alert-lights', getAlertLights);

// 創建告警燈號位置
router.post('/:regionCode/alert-lights', authenticate, createAlertLight);

// 刪除告警燈號位置（使用 region_id）
router.delete('/id/:regionId/alert-lights/:lightId', authenticate, deleteAlertLightById);

// 刪除告警燈號位置（使用 region_code，向后兼容）
router.delete('/:regionCode/alert-lights/:lightId', authenticate, deleteAlertLight);

// 獲取指定地區的里程點災害數量統計（使用 region_id）- 必須在 /:regionCode 路由之前
router.get('/id/:regionId/disaster-counts', getDisasterCountsByMileageById);

// 獲取指定地區的里程點災害數量統計（使用 region_code，向后兼容）
router.get('/:regionCode/disaster-counts', getDisasterCountsByMileage);

// ─── 監測圖資 ────────────────────────────────────────────────────────────────

// multer：上傳監測圖資到 uploads/monitoring/{regionCode}/
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, '../..');

const monitoringStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(BACKEND_ROOT, 'uploads/monitoring', req.params.regionCode);
    import('fs').then(fs => {
      fs.default.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    });
  },
  filename: (req, file, cb) => {
    const safeName = sanitizeOriginalName(file.originalname);
    cb(null, createStoredFilename('monitoring', safeName));
  }
});
const monitoringUpload = multer({
  storage: monitoringStorage,
  limits: { fileSize: maxUploadSize('monitoringLayer') },
  fileFilter: createMulterFileFilter('monitoringLayer')
});

// 取得指定區域的所有監測圖資清單（使用 region_id）- 必須在 /:regionCode 之前
router.get('/id/:regionId/layers', getRegionLayersById);

// 取得指定區域的所有監測圖資清單（使用 region_code，向后兼容）
router.get('/:regionCode/layers', getRegionLayers);

// 新增 / 上傳監測圖資
router.post('/:regionCode/layers', authenticate, monitoringUpload.single('file'), upsertRegionLayer);

// 更新監測圖資設定
router.put('/:regionCode/layers/:layerId', authenticate, upsertRegionLayer);

// 停用監測圖資
router.delete('/layers/:layerId', authenticate, deleteRegionLayer);

export default router;
