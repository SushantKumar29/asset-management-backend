import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createReport, getMyReports, downloadReport } from '../controllers/reportController';

const router = Router();

router.use(authenticate);

router.post('/report', createReport);
router.get('/my-reports', getMyReports);
router.get('/download/:reportId', downloadReport);

export default router;
