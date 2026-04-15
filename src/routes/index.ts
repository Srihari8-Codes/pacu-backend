import { Router } from 'express';
import authRoutes from './auth.routes';
import patientRoutes from './patients.routes';
import episodeRoutes from './episodes.routes';
import vitalsRoutes from './vitals.routes';
import instructionRoutes from './instructions.routes';
import { episodeMessagesRouter, taskRouter } from './messages.routes';
import { getAllAlerts } from '../controllers/vitals.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Health check — called by Android app on startup
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
router.use('/auth', authRoutes);

// Patients
router.use('/patients', patientRoutes);

// Instructions
router.use('/instructions', instructionRoutes);

// Episodes
router.use('/episodes', episodeRoutes);

// Vitals — episode-scoped: /api/episodes/:episodeId/vitals
router.use('/episodes/:episodeId/vitals', vitalsRoutes);

// Messages — episode-scoped: /api/episodes/:episodeId/messages
router.use('/episodes/:episodeId/messages', episodeMessagesRouter);

// Tasks — /api/messages/:messageId/task
router.use('/messages', taskRouter);

// Global Alerts — /api/alerts
router.get('/alerts', authenticate, getAllAlerts);

export default router;

