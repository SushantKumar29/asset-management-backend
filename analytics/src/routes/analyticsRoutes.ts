import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAssetSummary,
  getAssetsByType,
  getPopularAssets,
} from '../controllers/analyticsController';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/summary', getAssetSummary);
router.get('/type', getAssetsByType);
router.get('/popular', getPopularAssets);

export default router;
