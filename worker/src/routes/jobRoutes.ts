import { Router } from 'express';
import { getJobs, getJobDetails } from '../controllers/jobController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/jobs', getJobs);
router.get('/jobs/:id', getJobDetails);

export default router;
