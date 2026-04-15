import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { z } from 'zod';
import { successResponse, errorResponse } from '../utils/response';

export const createPatientSchema = z.object({
    body: z.object({
        name: z.string(),
        age: z.number().int().optional(),
        gender: z.string().optional(),
        procedure: z.string().optional(),
        allergies: z.string().optional(),
    }),
});

// Helper to ensure compatibility with mobile apps expecting "id" or "hospitalPatientId"
const formatPatientResponse = (patient: any) => {
    if (!patient) return null;
    // Extract the active episode ID from the included episodes array (if present)
    const activeEpisodeId = patient.episodes && patient.episodes.length > 0
        ? patient.episodes[0].id
        : null;
    return {
        ...patient,
        id: patient.patient_id,
        hospitalPatientId: patient.patient_id,
        activeEpisodeId,
    };
};

export const createPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, age, gender, procedure, allergies } = req.body;
        const userId = req.user!.id; // Nurse creating the patient
        const p: any = prisma;

        // Generate a unique Patient ID: e.g., P + 5 random digits
        let patient_id = '';
        let isUnique = false;
        while (!isUnique) {
            patient_id = `P${Math.floor(10000 + Math.random() * 89999)}`;
            const existing = await p.patient.findFirst({ where: { patient_id } });
            if (!existing) isUnique = true;
        }

        const patient = await p.patient.create({
            data: {
                patient_id,
                name,
                age,
                gender,
                procedure,
                allergies,
                createdByUserId: userId
            },
        });

        return successResponse(res, { patient: formatPatientResponse(patient) }, 'Patient created successfully', 201);
    } catch (error) {
        next(error);
    }
};

export const searchPatients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { q } = req.query;
        const user = req.user!;
        const p: any = prisma;
        
        console.log(`[Search] User Role: ${user.role}, ID: ${user.id}`);
        console.log(`[Search] Query Parameter 'q':`, q);
        
        const queryStr = (typeof q === 'string') ? q.trim() : '';
        const queryStrUpper = queryStr.toUpperCase();

        // If no query, Nurses see their own recent patients, Doctors see nothing.
        if (!queryStr) {
            if (user.role === 'NURSE') {
                const patients = await p.patient.findMany({
                    where: { createdByUserId: user.id },
                    orderBy: { createdAt: 'desc' },
                    take: 50
                });
                return successResponse(res, { patients: patients.map(formatPatientResponse) });
            }
            return successResponse(res, { patients: [] });
        }

        // QUERY PROVIDED:
        // Rule 1: ID Search is GLOBAL and CASE-INSENSITIVE (Check both original and uppercase)
        // Rule 2: Name Search is RESTRICTED for Nurses.

        if (user.role === 'DOCTOR') {
            const patients = await p.patient.findMany({
                where: {
                    OR: [
                        { patient_id: { contains: queryStr } },
                        { patient_id: { contains: queryStrUpper } },
                        { name: { contains: queryStr } },
                        { name: { contains: queryStrUpper } }
                    ]
                },
                take: 50
            });
            console.log(`[Search Trace] User: ${user.id}, Role: DOCTOR, find: "${queryStr}", results: ${patients.length}`);
            return successResponse(res, { patients: patients.map(formatPatientResponse) });
        }

        if (user.role === 'NURSE') {
            const patients = await p.patient.findMany({
                where: {
                    OR: [
                        // Nurses can find ANY patient by exact ID (global lookup)
                        { patient_id: queryStr }, 
                        { patient_id: queryStrUpper },
                        // Or their OWN patients by name or partial ID
                        {
                            AND: [
                                { createdByUserId: user.id },
                                {
                                    OR: [
                                        { name: { contains: queryStr } },
                                        { name: { contains: queryStrUpper } },
                                        { patient_id: { contains: queryStr } },
                                        { patient_id: { contains: queryStrUpper } }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                take: 50
            });
            console.log(`[Search Trace] User: ${user.id}, Role: NURSE, find: "${queryStr}", results: ${patients.length}`);
            return successResponse(res, { patients: patients.map(formatPatientResponse) });
        }
        
        return successResponse(res, { patients: [] });
    } catch (error) {
        console.error("Search Patient Error:", error);
        next(error);
    }
};

export const getPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { patientId } = req.params;
        const p: any = prisma;

        // Clean ID (remove accidental colons)
        const cleanPatientId = patientId.startsWith(':') ? patientId.slice(1) : patientId;

        const patient = await p.patient.findFirst({
            where: {
                patient_id: cleanPatientId, // hospital ID e.g. P73402
            },
            include: {
                instructions: {
                    orderBy: { createdAt: 'desc' },
                    include: { doctor: { select: { name: true } } }
                },
                episodes: {
                    where: { status: 'ACTIVE' },
                    orderBy: { startTime: 'desc' },
                    take: 1,
                    select: { id: true, status: true }
                }
            },
        });

        if (!patient) {
            return errorResponse(res, 'Patient not found', 404);
        }

        const user = req.user!;
        // Removed strict NURSE isolation to allow global viewing via Search

        return successResponse(res, { patient: formatPatientResponse(patient) });
    } catch (error) {
        next(error);
    }
};

export const deletePatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { patientId } = req.params;
        const cleanPatientId = patientId.startsWith(':') ? patientId.slice(1) : patientId;
        const p: any = prisma;

        const patient = await p.patient.findFirst({
            where: { patient_id: cleanPatientId }
        });

        if (!patient) {
            return errorResponse(res, 'Patient not found', 404);
        }
        
        const user = req.user!;
        if (user.role === 'NURSE' && patient.createdByUserId !== user.id) {
            return errorResponse(res, 'Access denied. You can only delete patients you registered.', 403);
        }

        await p.patient.deleteMany({ where: { patient_id: cleanPatientId } });

        return successResponse(res, null, 'Patient deleted successfully');
    } catch (error) {
        next(error);
    }
};
