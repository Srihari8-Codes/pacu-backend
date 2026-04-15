import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { config } from '../config/env';
import { EmailService } from '../services/email.service';
import crypto from 'crypto';

// Zod Schemas
const passwordValidation = z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: passwordValidation,
        role: z.enum(['NURSE', 'DOCTOR']),
        phone: z.string().optional(),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string(),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});

export const verifyOtpSchema = z.object({
    body: z.object({
        email: z.string().email(),
        otp: z.string().length(6),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
        otp: z.string().length(6),
        newPassword: passwordValidation,
    }),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, role, phone } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            console.log(`Registration attempt failed: Email ${email} already registered.`);
            return errorResponse(res, `Conflict: The email address "${email}" is already registered. Please use a different email or log in.`, 409);
        }

        const passwordHash = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role,
                phone: phone || null,
            },
        });

        const accessToken = generateAccessToken({ userId: user.id, role: user.role });
        const refreshToken = generateRefreshToken({ userId: user.id, role: user.role });

        // Save refresh token to DB
        await (prisma as any).refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        });

        return successResponse(res, {
            token: accessToken,
            refreshToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        }, 'User registered successfully', 201);
    } catch (error) {
        console.error('Registration error:', error);
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.log(`[Auth Trace] Login failed: User NOT FOUND for email: ${email}`);
            return errorResponse(res, 'Invalid credentials', 401);
        }

        const isMatch = await comparePassword(password, user.passwordHash);
        if (!isMatch) {
            console.log(`[Auth Trace] Login failed: PASSWORD MISMATCH for user: ${email}`);
            return errorResponse(res, 'Invalid credentials', 401);
        }

        console.log(`[Auth Trace] Login SUCCESS: ${email} (${user.role})`);

        const accessToken = generateAccessToken({ userId: user.id, role: user.role });
        const refreshToken = generateRefreshToken({ userId: user.id, role: user.role });

        // Save refresh token to DB
        await (prisma as any).refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        });

        return successResponse(res, {
            token: accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error details:', error);
        next(error);
    }
};

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2),
    }),
});

export const me = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
        });

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        return successResponse(res, { user });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { name } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { name },
            select: { id: true, name: true, email: true, role: true, phone: true },
        });

        return successResponse(res, { user: updatedUser }, 'Profile updated successfully');
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // We return success even if user not found for security reasons (avoid email enumeration)
            // But we can log it or handle it differently if desired.
            return successResponse(res, null, 'If an account exists with this email, an OTP has been sent.');
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Store OTP in database
        await prisma.passwordReset.create({
            data: {
                email,
                otp,
                expiresAt,
            },
        });

        // Send OTP via email
        await EmailService.sendOTP(email, otp);

        return successResponse(res, null, 'OTP sent successfully. Please check your email.');
    } catch (error) {
        next(error);
    }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, otp } = req.body;

        const resetRequest = await prisma.passwordReset.findFirst({
            where: {
                email,
                otp,
                used: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!resetRequest) {
            return errorResponse(res, 'Invalid or expired OTP', 400);
        }

        return successResponse(res, null, 'OTP verified successfully');
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, otp, newPassword } = req.body;

        const resetRequest = await prisma.passwordReset.findFirst({
            where: {
                email,
                otp,
                used: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!resetRequest) {
            return errorResponse(res, 'Invalid or expired OTP', 400);
        }

        // Hash new password
        const passwordHash = await hashPassword(newPassword);

        // Update user password and mark OTP as used
        await prisma.$transaction([
            prisma.user.update({
                where: { email },
                data: { passwordHash },
            }),
            prisma.passwordReset.update({
                where: { id: resetRequest.id },
                data: { used: true },
            }),
        ]);

        return successResponse(res, null, 'Password reset successfully. You can now login with your new password.');
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return errorResponse(res, 'Refresh token required', 400);
        }

        const storedToken = await (prisma as any).refreshToken.findUnique({
            where: { token: refreshToken }
        });

        if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
            return errorResponse(res, 'Invalid or expired refresh token', 401);
        }

        // Manually fetch user because relation might be broken by generated client
        const user = await prisma.user.findUnique({
             where: { id: storedToken.userId }
        });

        if (!user) {
             return errorResponse(res, 'User associated with token not found', 404);
        }

        const accessToken = generateAccessToken({ userId: user.id, role: user.role });
        const newRefreshToken = generateRefreshToken({ userId: user.id, role: user.role });


        // Rotate Refresh Token
        await prisma.$transaction([
            (prisma as any).refreshToken.update({
                where: { id: storedToken.id },
                data: { revoked: true }
            }),
            (prisma as any).refreshToken.create({
                data: {
                    token: newRefreshToken,
                    userId: storedToken.userId,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            })
        ]);

        return successResponse(res, {
            token: accessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await (prisma as any).refreshToken.updateMany({
                where: { token: refreshToken },
                data: { revoked: true }
            });
        }
        return successResponse(res, null, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};
