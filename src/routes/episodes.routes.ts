import { Router } from 'express';
import {
    createEpisode, getActiveEpisodes, getEpisode, dischargeEpisode,
    assignNurse, handover, unassignNurse, claimEpisode, getAssignments,
    createEpisodeSchema, assignNurseSchema, handoverSchema, dischargeSchema
} from '../controllers/episodes.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

router.use(authenticate);

router.post('/', requireRole(['NURSE', 'DOCTOR']), validate(createEpisodeSchema), createEpisode);
router.get('/active', getActiveEpisodes);
router.get('/:episodeId', getEpisode);
router.patch('/:episodeId/discharge', requireRole(['DOCTOR']), validate(dischargeSchema), dischargeEpisode);
router.post('/:episodeId/assign', requireRole(['NURSE', 'DOCTOR']), validate(assignNurseSchema), assignNurse);
router.post('/:episodeId/handover', requireRole(['NURSE', 'DOCTOR']), validate(handoverSchema), handover);
router.post('/:episodeId/unassign', requireRole(['NURSE']), unassignNurse);
router.post('/:episodeId/claim', requireRole(['NURSE']), claimEpisode);
router.get('/:episodeId/assignments', getAssignments);

export default router;
