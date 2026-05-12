import { Router } from 'express';
import { getLayerByBBox, getLayerInfo } from '../controllers/spatialLayerController.js';

const router = Router();

// GET /api/spatial/:layer/bbox?xmin=&ymin=&xmax=&ymax=&limit=
router.get('/:layer/bbox', getLayerByBBox);

// GET /api/spatial/:layer/info
router.get('/:layer/info', getLayerInfo);

export default router;
