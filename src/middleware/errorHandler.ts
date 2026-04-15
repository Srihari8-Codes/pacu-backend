import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err); // Log for debugging

    if (err.name === 'ZodError') {
        return errorResponse(res, 'Validation Error', 400, err.errors);
    }

    if (err.name === 'PrismaClientKnownRequestError') {
        // Handle Prisma specific errors (e.g., unique constraint violation)
        if (err.code === 'P2002') {
            const fields = err.meta?.target || 'unknown fields';
            // Handled via response below
            return errorResponse(res, `Conflict: Field already in use (${fields})`, 409, err.meta);
        }
        // Record not found
        if (err.code === 'P2025') {
            return errorResponse(res, 'Record not found', 404);
        }
    }

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    return errorResponse(res, message, statusCode);
};
