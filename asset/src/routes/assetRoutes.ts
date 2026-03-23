import { Router } from 'express';
import { uploadMultiple, uploadSingle } from '../middleware/upload';
import {
  uploadAsset,
  uploadMultipleAssets,
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
router.post('/upload', uploadSingle, uploadAsset);
router.post('/upload-multiple', uploadMultiple, uploadMultipleAssets);
router.delete('/:id', deleteAsset);
router.get('/:id/tags', getAssetTags);

export default router;
