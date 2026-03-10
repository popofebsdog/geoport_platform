import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
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
  getDisasterCountsByMileageById
} from '../controllers/warningRegionController.js';

const router = express.Router();

/**
 * @swagger
 * /api/warning-regions:
 *   get:
 *     tags: [WarningRegions]
 *     summary: List warning regions
 *     description: List warning regions.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Warning regions returned }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 *   post:
 *     tags: [WarningRegions]
 *     summary: Create warning region
 *     description: Create warning region.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201: { description: Created }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 * /api/warning-regions/{id}:
 *   get:
 *     tags: [WarningRegions]
 *     summary: Get warning region
 *     description: Get warning region by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Warning region returned }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   put:
 *     tags: [WarningRegions]
 *     summary: Update warning region
 *     description: Update warning region by ID.
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
 *     tags: [WarningRegions]
 *     summary: Delete warning region
 *     description: Delete warning region by ID.
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
 * /api/warning-regions/import:
 *   post:
 *     tags: [WarningRegions]
 *     summary: Import warning regions from XLSX
 *     description: Import warning regions data from XLSX file.
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
 *       200: { description: Imported }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 */

// 獲取所有預警地區列表
router.get('/', getWarningRegions);

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
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB — XLSX/file uploads for warning regions
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.json', '.geojson', '.zip', '.pdf', '.jpg', '.jpeg', '.png', '.tif', '.tiff'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支援的檔案類型'), false);
    }
  }
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

export default router;
