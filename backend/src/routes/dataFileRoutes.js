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
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 資料檔案路由
router.get('/', getAllDataFiles);
router.get('/deleted', getDeletedDataFiles);
router.get('/:id', getDataFileById);
router.post('/', authenticate, createDataFile);
router.put('/:id', authenticate, updateDataFile);
router.delete('/:id', authenticate, deleteDataFile);
router.delete('/:id/permanent', authenticate, permanentDeleteDataFile);
router.patch('/:id/restore', authenticate, restoreDataFile);

export default router;
