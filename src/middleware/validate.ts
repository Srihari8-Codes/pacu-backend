import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { errorResponse } from '../utils/response';

export const validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            console.error('Validation Error for path:', req.path);
            console.error('Body:', JSON.stringify(req.body, null, 2));
            console.error('Errors:', JSON.stringify(error.errors, null, 2));
            return errorResponse(res, 'Validation Error', 400, error.errors);
        }
        console.error('Internal Validation Error:', error);
        return errorResponse(res, 'Internal Validation Error', 500);
    }
};
