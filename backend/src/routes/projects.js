import express from 'express';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  toggleBookmark,
  getDeletedProjects,
  restoreProject
} from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List all projects
 *     description: Get project list.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Project list }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 *   post:
 *     tags: [Projects]
 *     summary: Create project
 *     description: Create a new project.
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
 * /api/projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project by ID
 *     description: Get project details.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Project detail }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *       500: { description: Server error }
 *   put:
 *     tags: [Projects]
 *     summary: Update project
 *     description: Update project fields.
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
 *     tags: [Projects]
 *     summary: Delete project
 *     description: Delete a project by ID.
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

// 項目路由
router.get('/', getAllProjects);
router.get('/deleted', getDeletedProjects);
router.get('/:id', getProjectById);
router.post('/', authenticate, createProject);
router.put('/:id', authenticate, updateProject);
router.delete('/:id', authenticate, deleteProject);
router.patch('/:id/bookmark', authenticate, toggleBookmark);
router.patch('/:id/restore', authenticate, restoreProject);

export default router;
