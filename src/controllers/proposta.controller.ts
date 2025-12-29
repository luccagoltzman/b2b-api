import { Request, Response, NextFunction } from 'express';
import { PropostaService } from '../services/proposta.service';
import { AppError } from '../middleware/errorHandler';
import { z, ZodError } from 'zod';

const propostaSchema = z.object({
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  valor: z.number().positive('Valor deve ser positivo'),
  status: z.enum([
    'rascunho',
    'pendente',
    'enviada',
    'em_analise_gerente_compras',
    'em_analise_diretoria',
    'aprovada',
    'rejeitada',
    'cancelada',
  ]).optional(),
  dataVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Data deve estar no formato YYYY-MM-DD'),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum([
    'rascunho',
    'pendente',
    'enviada',
    'em_analise_gerente_compras',
    'em_analise_diretoria',
    'aprovada',
    'rejeitada',
    'cancelada',
  ]),
  descricao: z.string().optional(),
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

  atualizarStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      console.log('Atualizando status da proposta:', { id, body: req.body });
      
      try {
        const { status, descricao } = statusUpdateSchema.parse(req.body);
        console.log('Dados validados:', { status, descricao });

        const proposta = await this.propostaService.atualizarStatus(id, status, descricao);
        res.json(proposta);
      } catch (validationError: any) {
        // Se for erro de validação do Zod
        if (validationError instanceof ZodError) {
          const errorMessage = validationError.errors
            .map((e) => {
              if (e.path.includes('status')) {
                return `Status inválido: "${req.body.status}". Status válidos: rascunho, pendente, enviada, em_analise_gerente_compras, em_analise_diretoria, aprovada, rejeitada, cancelada`;
              }
              return `${e.path.join('.')}: ${e.message}`;
            })
            .join(', ');
          throw new AppError(errorMessage, 'VALIDATION_ERROR', 400);
        }
        throw validationError;
      }
    } catch (error: any) {
      console.error('Erro ao atualizar status:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
      });
      next(error);
    }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const propostaExistente = await this.propostaService.buscarPorId(id, false);
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

