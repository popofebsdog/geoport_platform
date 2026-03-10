/**
 * 母專案路由
 * 處理母專案（地點）相關的 API 請求
 */

import express from 'express';
import {
  getAllParentProjects,
  getParentProjectById,
  createParentProject,
  updateParentProject,
  deleteParentProject
} from '../controllers/parentProjectController.js';
import {
  getChildProjectsByParent,
  createChildProject
} from '../controllers/childProjectController.js';
import {
  getReportLinks,
  createReportLink,
  updateReportLink,
  deleteReportLink
} from '../controllers/projectReportLinkController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/parent-projects:
 *   get:
 *     tags: [ParentProjects]
 *     summary: List parent projects
 *     description: List all parent projects.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Parent projects returned }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 *   post:
 *     tags: [ParentProjects]
 *     summary: Create parent project
 *     description: Create a parent project.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 * /api/parent-projects/{id}:
 *   get:
 *     tags: [ParentProjects]
 *     summary: Get parent project
 *     description: Get parent project by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Parent project returned }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   put:
 *     tags: [ParentProjects]
 *     summary: Update parent project
 *     description: Update parent project by ID.
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
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   delete:
 *     tags: [ParentProjects]
 *     summary: Delete parent project
 *     description: Delete parent project by ID.
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

// 母專案 CRUD
router.get('/', getAllParentProjects);
router.get('/:id', getParentProjectById);
router.post('/', authenticate, createParentProject);
router.put('/:id', authenticate, updateParentProject);
router.delete('/:id', authenticate, deleteParentProject);

// 子專案管理（在母專案路由下）
router.get('/:parentId/children', getChildProjectsByParent);
router.post('/:parentId/children', authenticate, createChildProject);

// 報告連結管理
router.get('/:id/report-links', getReportLinks);
router.post('/:id/report-links', authenticate, createReportLink);
router.put('/:id/report-links/:linkId', authenticate, updateReportLink);
router.delete('/:id/report-links/:linkId', authenticate, deleteReportLink);

export default router;
