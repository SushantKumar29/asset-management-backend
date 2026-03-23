import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { setMetadata, getMetadata, deleteMetadata } from '../controllers/metadataController';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/:assetId', setMetadata);
router.get('/:assetId', getMetadata);
router.delete('/:assetId/:key', deleteMetadata);

export default router;
