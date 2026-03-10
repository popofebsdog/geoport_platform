/**
 * 子專案路由
 * 處理子專案（時間週期）相關的 API 請求
 */

import express from 'express';
import {
  getAllChildProjects,
  getChildProjectById,
  updateChildProject,
  deleteChildProject
} from '../controllers/childProjectController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/child-projects/{parentId}/children:
 *   get:
 *     tags: [ChildProjects]
 *     summary: List children of parent
 *     description: Get all child projects under a parent project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Child project list }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 *   post:
 *     tags: [ChildProjects]
 *     summary: Create child project
 *     description: Create a child project under parent.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
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
 *       201: { description: Created }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 * /api/child-projects/{parentId}/children/{childId}:
 *   get:
 *     tags: [ChildProjects]
 *     summary: Get child
 *     description: Get child project by ID under parent.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: childId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Child project returned }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   put:
 *     tags: [ChildProjects]
 *     summary: Update child
 *     description: Update child project by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: childId
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
 *     tags: [ChildProjects]
 *     summary: Delete child
 *     description: Delete child project by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: childId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 */

// 子專案 CRUD
router.get('/', getAllChildProjects);
router.get('/:id', getChildProjectById);
router.put('/:id', authenticate, updateChildProject);
router.delete('/:id', authenticate, deleteChildProject);

export default router;
