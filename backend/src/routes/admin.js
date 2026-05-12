import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  auditAdminFiles,
  checkAdminFile,
  getAdminFiles,
  getAdminHealth,
  getAdminIssues,
  getAdminOverview,
  getAdminProjectDetail
} from '../controllers/adminController.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/overview', getAdminOverview);
router.get('/files', getAdminFiles);
router.get('/files/audit', auditAdminFiles);
router.get('/files/:id/check', checkAdminFile);
router.get('/health', getAdminHealth);
router.get('/issues', getAdminIssues);
router.get('/projects/:id', getAdminProjectDetail);

export default router;
