import { Request, Response, NextFunction } from 'express';
import { getIO } from '../realtime/socket';
import prisma from '../config/prisma';
import { z } from 'zod';
import { successResponse, errorResponse } from '../utils/response';

export const createInstructionSchema = z.object({
    body: z.object({
        patientId: z.string(), // This is now the patient_id (e.g. P12345)
        instruction: z.string(),
    }),
});

export const createInstruction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { patientId, instruction } = req.body;
        const doctorId = req.user!.id;
        const p: any = prisma;

        if (req.user!.role !== 'DOCTOR') {
            return errorResponse(res, 'Only doctors can issue instructions', 403);
        }

        // Verify patient exists using patient_id
        const patient = await p.patient.findUnique({
            where: { patient_id: patientId }
        });

        if (!patient) {
            return errorResponse(res, 'Patient not found', 404);
        }

        const newInstruction = await p.instruction.create({
            data: {
                patientId: patient.patient_id,
                doctorId,
                instruction,
            },
            include: { doctor: { select: { name: true } } }
        });

        // Emit realtime
        const io = getIO();
        io.to(`patient:${patientId}`).emit('new_instruction', newInstruction);

        return successResponse(res, { instruction: newInstruction }, 'Instruction created', 201);
    } catch (error) {
        next(error);
    }
};

export const getPatientInstructions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { patientId } = req.params;
        const cleanPatientId = patientId.startsWith(':') ? patientId.slice(1) : patientId;
        const p: any = prisma;

        const patient = await p.patient.findUnique({
            where: { patient_id: cleanPatientId }
        });

        if (!patient) {
            return errorResponse(res, 'Patient not found', 404);
        }

        const user = req.user!;
        // NURSE isolation check
        if (user.role === 'NURSE' && patient.createdByUserId !== user.id) {
             return errorResponse(res, 'Access denied. Data isolated to managing nurse.', 403);
        }

        const instructions = await p.instruction.findMany({
            where: { patientId: patient.patient_id },
            include: { doctor: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' }
        });

        return successResponse(res, { instructions });
    } catch (error) {
        next(error);
    }
};
