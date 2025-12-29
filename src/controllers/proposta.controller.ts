import { Request, Response, NextFunction } from 'express';
import { PropostaService } from '../services/proposta.service';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const propostaSchema = z.object({
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  valor: z.number().positive('Valor deve ser positivo'),
  status: z.enum(['pendente', 'aprovada', 'rejeitada', 'enviada']).optional(),
  dataVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Data deve estar no formato YYYY-MM-DD'),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
});

const propostaUpdateSchema = propostaSchema.partial();

export class PropostaController {
  private propostaService: PropostaService;

  constructor() {
    this.propostaService = new PropostaService();
  }

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const propostas = await this.propostaService.listar();
      res.json(propostas);
    } catch (error) {
      next(error);
    }
  };

  buscarPorId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const proposta = await this.propostaService.buscarPorId(id);

      if (!proposta) {
        throw new AppError('Proposta não encontrada', 'NOT_FOUND', 404);
      }

      res.json(proposta);
    } catch (error) {
      next(error);
    }
  };

  criar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = propostaSchema.parse(req.body);
      const proposta = await this.propostaService.criar(dados);
      res.status(201).json(proposta);
    } catch (error) {
      next(error);
    }
  };

  atualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dados = propostaUpdateSchema.parse(req.body);

      const propostaExistente = await this.propostaService.buscarPorId(id);
      if (!propostaExistente) {
        throw new AppError('Proposta não encontrada', 'NOT_FOUND', 404);
      }

      const proposta = await this.propostaService.atualizar(id, dados);
      res.json(proposta);
    } catch (error) {
      next(error);
    }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const propostaExistente = await this.propostaService.buscarPorId(id);
      if (!propostaExistente) {
        throw new AppError('Proposta não encontrada', 'NOT_FOUND', 404);
      }

      await this.propostaService.deletar(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

