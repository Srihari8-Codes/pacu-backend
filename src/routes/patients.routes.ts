import { Router } from 'express';
import { createPatient, searchPatients, getPatient, deletePatient, createPatientSchema } from '../controllers/patients.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

router.use(authenticate);

router.post('/', requireRole(['NURSE', 'DOCTOR']), validate(createPatientSchema), createPatient);
router.get('/', searchPatients); // Standardized search at /
router.get('/:patientId', getPatient);
router.delete('/:patientId', requireRole(['DOCTOR']), deletePatient);

export default router;
