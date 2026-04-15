import { Router } from 'express';
import { sendMessage, getMessages, updateTaskStatus, sendMessageSchema, updateTaskSchema } from '../controllers/messages.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const episodeMessagesRouter = Router({ mergeParams: true });
episodeMessagesRouter.use(authenticate);

// Nurses/Doctors can send CHAT, only DOCTOR/ADMIN can send TASK/INSTRUCTION
// The logic is in the controller too, but middleware can provide extra layer
episodeMessagesRouter.post('/', validate(sendMessageSchema), sendMessage);
episodeMessagesRouter.get('/', getMessages);

const taskRouter = Router();
taskRouter.use(authenticate);
taskRouter.patch('/:messageId/task', requireRole(['NURSE', 'DOCTOR']), validate(updateTaskSchema), updateTaskStatus);

export { episodeMessagesRouter, taskRouter };
