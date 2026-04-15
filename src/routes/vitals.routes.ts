import { Router } from 'express';
import { addVitals, getVitals, getLatestVitals, addVitalsSchema, getAllAlerts } from '../controllers/vitals.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router({ mergeParams: true }); // Important for :episodeId param

router.use(authenticate);

router.post('/', requireRole(['NURSE', 'DOCTOR']), validate(addVitalsSchema), addVitals);
router.get('/', getVitals);
router.get('/latest', getLatestVitals);
router.get('/alerts/history', requireRole(['DOCTOR', 'NURSE']), getAllAlerts);

export default router;
