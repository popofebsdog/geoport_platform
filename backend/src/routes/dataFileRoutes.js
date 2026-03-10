import express from 'express';
import {
  getAllDataFiles,
  getDataFileById,
  createDataFile,
  updateDataFile,
  deleteDataFile,
  permanentDeleteDataFile,
  getDeletedDataFiles,
  restoreDataFile
} from '../controllers/dataFileController.js';

const router = express.Router();

/**
 * @swagger
 * /api/data-files:
 *   get:
 *     tags: [DataFiles]
 *     summary: List data files
 *     description: List all data files.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Data files returned }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 * /api/data-files/upload:
 *   post:
 *     tags: [DataFiles]
 *     summary: Upload data file
 *     description: Upload a data file via multipart/form-data.
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
 *       201: { description: Uploaded }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 * /api/data-files/{id}:
 *   get:
 *     tags: [DataFiles]
 *     summary: Get data file
 *     description: Get data file by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Data file returned }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   delete:
 *     tags: [DataFiles]
 *     summary: Delete data file
 *     description: Delete data file by ID.
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
 */

// 資料檔案路由
router.get('/', getAllDataFiles);                    // 獲取所有資料檔案
router.get('/deleted', getDeletedDataFiles);         // 獲取已刪除資料檔案
router.get('/:id', getDataFileById);                 // 獲取單個資料檔案
router.post('/', createDataFile);                    // 創建資料檔案
router.put('/:id', updateDataFile);                  // 更新資料檔案
router.delete('/:id', deleteDataFile);               // 刪除資料檔案
router.delete('/:id/permanent', permanentDeleteDataFile); // 永久刪除資料檔案
router.patch('/:id/restore', restoreDataFile);       // 還原資料檔案

export default router;
