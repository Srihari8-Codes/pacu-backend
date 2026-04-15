import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

export const requireRole = (roles: string | string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return errorResponse(res, 'Unauthorized', 401);
        }

        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(req.user.role)) {
            return errorResponse(res, 'Forbidden: Insufficient permissions', 403);
        }

        next();
    };
};
