import { Router } from 'express';
import { uploadMultiple } from '../middleware/upload';
import {
  uploadAssets,
  getAssets,
  getAsset,
  deleteAsset,
  getAssetTags,
} from '../controllers/assetsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAssets);
router.get('/:id', getAsset);
router.post('/upload', uploadMultiple, uploadAssets);
router.delete('/:id', deleteAsset);
router.get('/:id/tags', getAssetTags);

export default router;
