import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  trackUsage,
  getAssetUsage,
  getRecentActivity,
  getUsageSummary,
} from '../controllers/usageController';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/:assetId', getAssetUsage);
router.get('/activity/recent', getRecentActivity);
router.get('/summary/overview', getUsageSummary);
router.post('/:assetId', trackUsage);

export default router;
