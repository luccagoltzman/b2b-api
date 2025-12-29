import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    const errorResponse: ErrorResponse = {
      error: err.message,
      code: err.code,
    };
    return res.status(err.statusCode).json(errorResponse);
  }

  console.error('Erro não tratado:', err);

  const errorResponse: ErrorResponse = {
    error: 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR',
  };

  return res.status(500).json(errorResponse);
};

