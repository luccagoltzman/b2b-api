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

  // Log detalhado do erro para debug
  console.error('Erro não tratado:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    path: req.path,
    method: req.method,
  });

  // Verificar se é erro do Prisma (tabela não existe, etc)
  const prismaError = err as any;
  if (prismaError.code === 'P2021' || prismaError.message?.includes('Table') || prismaError.message?.includes('does not exist')) {
    const errorResponse: ErrorResponse = {
      error: 'Tabela de checkpoints não encontrada. Execute a migração: npm run prisma:migrate',
      code: 'DATABASE_MIGRATION_REQUIRED',
    };
    return res.status(500).json(errorResponse);
  }

  const errorResponse: ErrorResponse = {
    error: err.message || 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR',
  };

  return res.status(500).json(errorResponse);
};

