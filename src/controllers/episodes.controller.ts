import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';
import { successResponse, errorResponse } from '../utils/response';

// Schemas
export const createEpisodeSchema = z.object({
    body: z.object({
        patientId: z.string(), // This is the patient_id (e.g. P12345)
        bedNumber: z.string().optional(),
    }),
});

export const assignNurseSchema = z.object({
    body: z.object({
        nurseId: z.string().uuid(),
    }),
});

export const handoverSchema = z.object({
    body: z.object({
        toNurseId: z.string().uuid(),
        handoverNote: z.string().optional(),
    }),
});

export const dischargeSchema = z.object({
    body: z.object({
        endTime: z.string().datetime().optional()
    })
});

// Controllers
import { getIO } from '../realtime/socket';

export const createEpisode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { patientId, bedNumber } = req.body;
        const userId = req.user!.id;
        const p: any = prisma;

        // Verify patient exists using patient_id
        const patient = await p.patient.findUnique({ where: { patient_id: patientId } });
        if (!patient) return errorResponse(res, 'Patient not found', 404);

        // Removed strict NURSE isolation to allow starting episodes for any patient found via Global Search

        // Check if active episode exists
        const activeExists = await p.episode.findFirst({
            where: {
                patientId: patient.patient_id,
                status: 'ACTIVE',
            },
        });

        if (activeExists) {
            return errorResponse(res, 'Patient already has an active episode', 409);
        }

        const episode = await p.episode.create({
            data: {
                patientId: patient.patient_id,
                bedNumber,
                status: 'ACTIVE',
                createdByUserId: userId,
            },
            include: {
                patient: true
            }
        });

        if (req.user!.role === 'NURSE') {
            await p.assignment.create({
                data: {
                    episodeId: episode.id,
                    nurseId: userId,
                }
            });
        }

        // Emit globally so all dashboards can update their lists
        getIO().emit('new_episode', episode);

        return successResponse(res, { episode }, 'Episode started', 201);
    } catch (error) {
        next(error);
    }
};

export const getActiveEpisodes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const p: any = prisma;
        const whereClause: any = { status: 'ACTIVE' };

        // Nurse isolation: only see episodes for patients they created OR are currently assigned to
        if (user.role === 'NURSE') {
            whereClause.OR = [
                { createdByUserId: user.id },
                { assignments: { some: { nurseId: user.id, toTime: null } } }
            ];
        }

        const episodes = await p.episode.findMany({
            where: whereClause,
            include: {
                patient: true,
                assignments: {
                    where: { toTime: null },
                    include: { nurse: { select: { name: true, id: true } } }
                },
                vitals: {
                    orderBy: { recordedAt: 'desc' },
                    take: 1
                },
                createdBy: { select: { id: true, name: true } }
            },
            orderBy: { startTime: 'desc' },
        });
        return successResponse(res, { episodes });
    } catch (error) {
        next(error);
    }
};

export const getEpisode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const p: any = prisma;
        const episode = await p.episode.findUnique({
            where: { id: episodeId },
            include: {
                patient: true,
                assignments: {
                    orderBy: { fromTime: 'desc' },
                    include: { nurse: { select: { name: true, id: true } } }
                },
            },
        });

        if (!episode) return errorResponse(res, 'Episode not found', 404);

        return successResponse(res, { episode });
    } catch (error) {
        next(error);
    }
};

export const dischargeEpisode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const { endTime } = req.body;
        const p: any = prisma;

        const episode = await p.episode.update({
            where: { id: episodeId },
            data: {
                status: 'DISCHARGED',
                endTime: endTime || new Date(),
            },
        });

        // Close any active assignments?
        await p.assignment.updateMany({
            where: { episodeId, toTime: null },
            data: { toTime: new Date() }
        });

        return successResponse(res, { episode }, 'Episode discharged');
    } catch (error) {
        next(error);
    }
};

export const assignNurse = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const { nurseId } = req.body;
        const p: any = prisma;

        const assignment = await p.assignment.create({
            data: {
                episodeId,
                nurseId,
            },
        });

        return successResponse(res, { assignment }, 'Nurse assigned');
    } catch (error) {
        next(error);
    }
};

export const handover = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const { toNurseId, handoverNote } = req.body;
        const fromNurseId = req.user!.id;
        const p: any = prisma;

        // Find active assignment for current nurse
        const currentAssignment = await p.assignment.findFirst({
            where: {
                episodeId,
                nurseId: fromNurseId,
                toTime: null,
            },
        });

        if (!currentAssignment) {
            return errorResponse(res, 'You are not currently assigned to this episode or assignment is closed', 400);
        }

        // Transaction to update old and create new
        const [updated, newAssignment] = await p.$transaction([
            p.assignment.update({
                where: { id: currentAssignment.id },
                data: {
                    toTime: new Date(),
                    handedOverToNurseId: toNurseId,
                    handoverNote,
                },
            }),
            p.assignment.create({
                data: {
                    episodeId,
                    nurseId: toNurseId,
                    fromTime: new Date(),
                },
            }),
        ]);

        return successResponse(res, { old: updated, new: newAssignment }, 'Handover complete');
    } catch (error) {
        next(error);
    }
};

export const unassignNurse = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const fromNurseId = req.user!.id;
        const p: any = prisma;

        const currentAssignment = await p.assignment.findFirst({
            where: {
                episodeId,
                nurseId: fromNurseId,
                toTime: null,
            },
        });

        if (!currentAssignment) {
            return errorResponse(res, 'You are not currently assigned to this episode or assignment is closed', 400);
        }

        const updated = await p.assignment.update({
            where: { id: currentAssignment.id },
            data: { toTime: new Date() },
        });

        return successResponse(res, { assignment: updated }, 'Successfully unassigned from patient');
    } catch (error) {
        next(error);
    }
};

export const claimEpisode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const nurseId = req.user!.id;
        const p: any = prisma;

        // Check if there's already an active assignment
        const activeAssignment = await p.assignment.findFirst({
            where: {
                episodeId,
                toTime: null,
            },
        });

        if (activeAssignment) {
            if (activeAssignment.nurseId === nurseId) {
                return errorResponse(res, 'You are already assigned to this patient', 400);
            }
            return errorResponse(res, 'This patient is already assigned to another nurse', 409);
        }

        const assignment = await p.assignment.create({
            data: {
                episodeId,
                nurseId,
                fromTime: new Date(),
            },
        });

        return successResponse(res, { assignment }, 'Patient claimed successfully');
    } catch (error) {
        next(error);
    }
};

export const getAssignments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { episodeId } = req.params;
        const p: any = prisma;
        const assignments = await p.assignment.findMany({
            where: { episodeId },
            include: {
                nurse: { select: { id: true, name: true } },
                handedOverTo: { select: { id: true, name: true } }
            },
            orderBy: { fromTime: 'desc' }
        });
        return successResponse(res, { assignments });
    } catch (error) {
        next(error);
    }
};
