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
