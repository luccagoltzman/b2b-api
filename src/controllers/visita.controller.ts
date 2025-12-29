import { Request, Response, NextFunction } from 'express';
import { VisitaService } from '../services/visita.service';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const visitaSchema = z.object({
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Data deve estar no formato YYYY-MM-DD'),
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
  status: z.enum([
    'agendada',
    'confirmada',
    'em_andamento',
    'realizada',
    'cancelada',
    'reagendada',
  ]).optional(),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum([
    'agendada',
    'confirmada',
    'em_andamento',
    'realizada',
    'cancelada',
    'reagendada',
  ]),
  descricao: z.string().optional(),
});

const visitaUpdateSchema = visitaSchema.partial();

export class VisitaController {
  private visitaService: VisitaService;

  constructor() {
    this.visitaService = new VisitaService();
  }

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visitas = await this.visitaService.listar();
      res.json(visitas);
    } catch (error) {
      next(error);
    }
  };

  buscarPorId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const visita = await this.visitaService.buscarPorId(id);

      if (!visita) {
        throw new AppError('Visita não encontrada', 'NOT_FOUND', 404);
      }

      res.json(visita);
    } catch (error) {
      next(error);
    }
  };

  criar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = visitaSchema.parse(req.body);
      const visita = await this.visitaService.criar(dados);
      res.status(201).json(visita);
    } catch (error) {
      next(error);
    }
  };

  atualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dados = visitaUpdateSchema.parse(req.body);

      const visitaExistente = await this.visitaService.buscarPorId(id);
      if (!visitaExistente) {
        throw new AppError('Visita não encontrada', 'NOT_FOUND', 404);
      }

      const visita = await this.visitaService.atualizar(id, dados);
      res.json(visita);
    } catch (error) {
      next(error);
    }
  };

  atualizarStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, descricao } = statusUpdateSchema.parse(req.body);

      const visita = await this.visitaService.atualizarStatus(id, status, descricao);
      res.json(visita);
    } catch (error) {
      next(error);
    }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const visitaExistente = await this.visitaService.buscarPorId(id, false);
      if (!visitaExistente) {
        throw new AppError('Visita não encontrada', 'NOT_FOUND', 404);
      }

      await this.visitaService.deletar(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

