import { Request, Response, NextFunction } from 'express';
import { getIO } from '../realtime/socket';
import prisma from '../config/prisma';
import { z } from 'zod';
import { successResponse, errorResponse } from '../utils/response';

export const addVitalsSchema = z.object({
    body: z.object({
        recordedAt: z.string().datetime(),
        systolicBP: z.number().int().optional(),
        diastolicBP: z.number().int().optional(),
        heartRate: z.number().int().optional(),
        spo2: z.number().int().optional(),
        respiratoryRate: z.number().int().optional(),
        temperature: z.number().optional(),
        painScore: z.number().int().optional(),
        recoveryScore: z.number().int().optional(),
        remarks: z.string().optional(),
        clientUuid: z.string().optional(),
    }),
});

export const addVitals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const {
            recordedAt, systolicBP, diastolicBP, heartRate, spo2,
            respiratoryRate, temperature, painScore, recoveryScore, remarks, clientUuid
        } = req.body;
        const userId = req.user!.id;
        const role = req.user!.role;
        const p: any = prisma;

        const episode = await p.episode.findUnique({
            where: { id: episodeId },
            include: { patient: true }
        });

        if (!episode) return errorResponse(res, 'Episode not found', 404);

        // Only assigned nurse or the nurse who created the patient (or any doctor) can add vitals
        if (role === 'NURSE') {
            const isCreator = episode.patient.createdByUserId === userId;
            const activeAssignment = await p.assignment.findFirst({
                where: {
                    episodeId,
                    nurseId: userId,
                    toTime: null
                }
            });
            
            if (!isCreator && !activeAssignment) {
                return errorResponse(res, 'You must be assigned to this patient to record vitals', 403);
            }
        }

        // Idempotency check
        if (clientUuid) {
            const existing = await p.vitals.findFirst({
                where: { clientUuid }
            });
            if (existing) {
                return successResponse(res, { vitals: existing }, 'Vitals already recorded', 200);
            }
        }

        const vitals = await p.vitals.create({
            data: {
                episodeId,
                recordedAt,
                systolicBP,
                diastolicBP,
                heartRate,
                spo2,
                respiratoryRate,
                temperature,
                painScore,
                recoveryScore,
                remarks,
                enteredByUserId: userId,
                clientUuid
            },
            include: { enteredBy: { select: { name: true } } }
        });

        // Realtime Emit
        const io = getIO();
        io.to(`episode:${episodeId}`).emit('new_vitals', vitals);

        return successResponse(res, { vitals }, 'Vitals recorded', 201);
    } catch (error) {
        next(error);
    }
};

export const getVitals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const { from, to } = req.query;
        const p: any = prisma;

        // Check isolation
        const episode = await p.episode.findUnique({
            where: { id: episodeId },
            include: { patient: true }
        });

        if (!episode) return errorResponse(res, 'Episode not found', 404);
        
        const user = req.user!;
        // Removed strict NURSE isolation for viewing vitals

        const whereClause: any = { episodeId };
        if (from || to) {
            whereClause.recordedAt = {};
            if (from) whereClause.recordedAt.gte = new Date(from as string);
            if (to) whereClause.recordedAt.lte = new Date(to as string);
        }

        const vitals = await p.vitals.findMany({
            where: whereClause,
            orderBy: { recordedAt: 'asc' }, // Timeline order
            include: { enteredBy: { select: { name: true } } }
        });

        return successResponse(res, { vitals });
    } catch (error) {
        next(error);
    }
};

export const getLatestVitals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const p: any = prisma;

        const vitals = await p.vitals.findFirst({
            where: { episodeId },
            orderBy: { recordedAt: 'desc' },
            include: { enteredBy: { select: { name: true } } }
        });

        // Even if no vitals, return 200 with null vitals so app can handle it
        return successResponse(res, { vitals });
    } catch (error) {
        next(error);
    }
};

export const getAllAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const p: any = prisma;
        
        // Define isolation filter
        const isolationFilter: any = {};
        if (user.role === 'NURSE') {
            isolationFilter.episode = {
                OR: [
                    { createdByUserId: user.id },
                    { assignments: { some: { nurseId: user.id, toTime: null } } }
                ]
            };
        }

        const vitalsAlerts = await p.vitals.findMany({
            where: {
                ...isolationFilter,
                OR: [
                    { spo2: { lt: 90 } },
                    { systolicBP: { gt: 180 } },
                    { temperature: { gt: 38.5 } }
                ]
            },
            take: 25,
            orderBy: { recordedAt: 'desc' },
            include: {
                episode: { include: { patient: true } },
                enteredBy: { select: { name: true } }
            }
        });

        const messages = await p.message.findMany({
            where: {
                ...isolationFilter,
                type: { in: ['INSTRUCTION', 'TASK'] },
                episode: { status: 'ACTIVE' }
            },
            take: 25,
            orderBy: { createdAt: 'desc' },
            include: {
                episode: { include: { patient: true } },
                sender: { select: { name: true } },
                taskStatus: true
            }
        });

        const instructions = await p.instruction.findMany({
            where: user.role === 'NURSE' ? {
                patient: {
                    OR: [
                        { createdByUserId: user.id },
                        { episodes: { some: {
                            OR: [
                                { createdByUserId: user.id },
                                { assignments: { some: { nurseId: user.id, toTime: null } } }
                            ],
                            status: 'ACTIVE'
                        }}}
                    ]
                }
            } : {},
            take: 25,
            orderBy: { createdAt: 'desc' },
            include: {
                patient: true,
                doctor: { select: { name: true } }
            }
        });

        // Combine and return
        return successResponse(res, { 
            alerts: vitalsAlerts,
            messages: messages,
            instructions: instructions
        });
    } catch (error) {
        next(error);
    }
};
