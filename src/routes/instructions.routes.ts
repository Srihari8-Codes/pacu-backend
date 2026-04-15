import { Router } from 'express';
import { createInstruction, getPatientInstructions, createInstructionSchema } from '../controllers/instructions.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.post('/', validate(createInstructionSchema), createInstruction);
router.get('/:patientId', getPatientInstructions);

export default router;
