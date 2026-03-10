import express from 'express';
import { sequelize } from '../config/database.js';

const router = express.Router();

// Get version from package.json
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
const version = packageJson.version;

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Basic health check
 *     description: Returns service health, version, uptime, and environment.
 *     responses:
 *       200: { description: Service is healthy }
 *       500: { description: Server error }
 * /api/health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness check
 *     description: Validates readiness including database connectivity.
 *     responses:
 *       200: { description: Ready }
 *       500: { description: Server error }
 */

// Basic health check - always returns 200
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version
  });
});

// Readiness check - checks DB connection
router.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', database: 'disconnected' });
  }
});

export default router;
