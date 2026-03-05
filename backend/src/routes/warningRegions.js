import express from 'express';
import multer from 'multer';
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
  deleteRegionProject,
  getAlertLights,
  getAlertLightsById,
  createAlertLight,
  deleteAlertLight,
  getDisasterCountsByMileage,
  getDisasterCountsByMileageById
} from '../controllers/warningRegionController.js';

const router = express.Router();

// 獲取所有預警地區列表
router.get('/', getWarningRegions);

// 根據地區代碼獲取地區資訊
router.get('/:regionCode', getWarningRegionByCode);

// 獲取指定地區的數據（使用 region_code，向后兼容）
router.get('/:regionCode/data', getWarningRegionData);

// 獲取指定地區的數據（使用 region_id）
router.get('/id/:regionId/data', getWarningRegionDataById);

// 創建或更新預警地區數據
router.post('/:regionCode/data', upsertWarningRegionData);

// 建立地區專案（包含上傳檔案）
const upload = multer({ dest: 'uploads/warning-regions/' });
router.post('/create-project', upload.array('files'), createRegionProject);

// 更新地區專案（使用 region_id）
router.put('/id/:regionId', updateRegionProject);

// 刪除地區專案（使用 region_id）
router.delete('/id/:regionId', deleteRegionProject);

// 獲取地區點位顏色配置（使用 region_id）- 必須在 /:regionCode 路由之前
router.get('/id/:regionId/point-colors', getPointColorsById);

// 獲取地區點位顏色配置（使用 region_code，向后兼容）
router.get('/:regionCode/point-colors', getPointColors);

// 更新或創建點位顏色配置（使用 region_id）- 必須在 /:regionCode 路由之前
router.post('/id/:regionId/point-colors', upsertPointColorById);

// 更新或創建點位顏色配置（使用 region_code，向后兼容）
router.post('/:regionCode/point-colors', upsertPointColor);

// 導入 Excel 巡查紀錄（僅第一筆數據）
router.post('/:regionCode/import-inspection', importInspectionRecordFromExcel);

// 獲取指定地區的巡查紀錄（使用 region_id）- 必須在 /:regionCode 路由之前
router.get('/id/:regionId/inspection-records', getInspectionRecordsById);

// 獲取指定地區的巡查紀錄（使用 region_code，向后兼容）
router.get('/:regionCode/inspection-records', getInspectionRecords);

// 創建巡查紀錄
router.post('/:regionCode/inspection-records', createInspectionRecord);

// 更新巡查紀錄
router.put('/:regionCode/inspection-records/:recordId', updateInspectionRecord);

// 獲取指定地區的告警燈號位置列表（使用 region_id）- 必須在 /:regionCode 路由之前
router.get('/id/:regionId/alert-lights', getAlertLightsById);

// 獲取指定地區的告警燈號位置列表（使用 region_code，向后兼容）
router.get('/:regionCode/alert-lights', getAlertLights);

// 創建告警燈號位置
router.post('/:regionCode/alert-lights', createAlertLight);

// 刪除告警燈號位置
router.delete('/:regionCode/alert-lights/:lightId', deleteAlertLight);

// 獲取指定地區的里程點災害數量統計（使用 region_id）- 必須在 /:regionCode 路由之前
router.get('/id/:regionId/disaster-counts', getDisasterCountsByMileageById);

// 獲取指定地區的里程點災害數量統計（使用 region_code，向后兼容）
router.get('/:regionCode/disaster-counts', getDisasterCountsByMileage);

export default router;

