import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
    register, login, me, updateProfile, refresh, logout,
    forgotPassword, verifyOtp, resetPassword,
    registerSchema, loginSchema, updateProfileSchema,
    forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rate limit: max 10 auth requests per 15 min per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Increased for development/testing
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many attempts. Try again in 15 minutes.' },
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.put('/me', authenticate, validate(updateProfileSchema), updateProfile);

// Password Reset Routes
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

export default router;

