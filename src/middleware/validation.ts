import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from './errorHandler';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors.map((e) => e.message).join(', ');
        throw new AppError(errorMessage, 'VALIDATION_ERROR', 400);
      }
      next(error);
    }
  };
};

