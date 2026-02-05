import { Request, Response, NextFunction } from 'express';
import { ClienteService } from '../services/cliente.service';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const clienteCreateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  empresa: z.string().optional(),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2, 'Estado deve ter no máximo 2 caracteres').optional(),
  cep: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
});

const clienteUpdateSchema = clienteCreateSchema.partial();

export class ClienteController {
  private clienteService: ClienteService;

  constructor() {
    this.clienteService = new ClienteService();
  }

  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientes = await this.clienteService.listar();
      res.json(clientes);
    } catch (error) {
      next(error);
    }
  };

  buscarPorId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const cliente = await this.clienteService.buscarPorId(id);
      if (!cliente) {
        throw new AppError('Cliente não encontrado', 'NOT_FOUND', 404);
      }
      res.json(cliente);
    } catch (error) {
      next(error);
    }
  };

  criar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = clienteCreateSchema.parse(req.body);
      const payload = {
        ...dados,
        email: dados.email || undefined,
      };
      const cliente = await this.clienteService.criar(payload);
      res.status(201).json(cliente);
    } catch (error) {
      next(error);
    }
  };

  atualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dados = clienteUpdateSchema.parse(req.body);
      const payload = {
        ...dados,
        ...(dados.email !== undefined && { email: dados.email || undefined }),
      };
      const cliente = await this.clienteService.atualizar(id, payload);
      res.json(cliente);
    } catch (error) {
      next(error);
    }
  };

  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.clienteService.deletar(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
