import { Request, Response, NextFunction } from 'express';
import { MercadoService } from '../services/mercado.service';
import { AppError } from '../middleware/errorHandler';
import { z, ZodError } from 'zod';

const precoMercadoSchema = z.object({
  produto: z.string().min(1, 'Produto é obrigatório'),
  marca: z.string().optional(),
  categoria: z.string().optional(),
  regiao: z.string().optional(),
  precoMedio: z.number().positive('Preço médio deve ser positivo'),
  precoMinimo: z.number().positive().optional(),
  precoMaximo: z.number().positive().optional(),
  unidadeMedida: z.string().optional(),
  fonte: z.string().optional(),
  observacoes: z.string().optional(),
});

const produtoVendidoRegiaoSchema = z.object({
  produto: z.string().min(1, 'Produto é obrigatório'),
  marca: z.string().optional(),
  categoria: z.string().optional(),
  regiao: z.string().min(1, 'Região é obrigatória'),
  posicaoRanking: z.number().int().positive('Posição no ranking deve ser positiva'),
  volumeVendas: z.number().positive().optional(),
  participacaoMercado: z.number().min(0).max(100).optional(),
  periodo: z.string().min(1, 'Período é obrigatório'),
  fonte: z.string().optional(),
  observacoes: z.string().optional(),
});

const produtoPedidoSupermercadoSchema = z.object({
  produto: z.string().min(1, 'Produto é obrigatório'),
  marca: z.string().optional(),
  categoria: z.string().optional(),
  tipoSupermercado: z.string().optional(),
  frequenciaPedidos: z.number().int().positive('Frequência de pedidos deve ser positiva'),
  demandaEstimada: z.number().positive().optional(),
  sazonalidade: z.string().optional(),
  periodo: z.string().min(1, 'Período é obrigatório'),
  fonte: z.string().optional(),
  observacoes: z.string().optional(),
});

const benchmarkSetorSchema = z.object({
  categoria: z.string().optional(),
  tipoMetrica: z.string().min(1, 'Tipo de métrica é obrigatório'),
  valorBenchmark: z.number({ message: 'Valor do benchmark deve ser um número' }),
  unidade: z.string().optional(),
  descricao: z.string().optional(),
  fonte: z.string().optional(),
  periodo: z.string().optional(),
});

export class MercadoController {
  private mercadoService: MercadoService;

  constructor() {
    this.mercadoService = new MercadoService();
  }

  // GET /api/mercado/precos
  obterPrecos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { produto, marca, categoria, regiao } = req.query;
      const precos = await this.mercadoService.obterPrecosMercado(
        produto as string,
        marca as string,
        categoria as string,
        regiao as string
      );
      res.json(precos);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/mercado/precos
  cadastrarPreco = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = precoMercadoSchema.parse(req.body);
      const preco = await this.mercadoService.cadastrarPrecoMercado(dados);
      res.status(201).json(preco);
    } catch (error) {
      if (error instanceof ZodError) {
        const camposFaltando = error.errors.map(e => e.path.join('.')).join(', ');
        throw new AppError(
          `Campos inválidos: ${camposFaltando}`,
          'VALIDATION_ERROR',
          400
        );
      }
      next(error);
    }
  };

  // GET /api/mercado/produtos-vendidos
  obterProdutosVendidos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { regiao, categoria, limite } = req.query;
      const produtos = await this.mercadoService.obterProdutosVendidosRegiao(
        regiao as string,
        categoria as string,
        limite ? parseInt(limite as string) : 20
      );
      res.json(produtos);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/mercado/produtos-vendidos
  cadastrarProdutoVendido = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = produtoVendidoRegiaoSchema.parse(req.body);
      const produto = await this.mercadoService.cadastrarProdutoVendidoRegiao(dados);
      res.status(201).json(produto);
    } catch (error) {
      if (error instanceof ZodError) {
        const camposFaltando = error.errors.map(e => e.path.join('.')).join(', ');
        throw new AppError(
          `Campos inválidos: ${camposFaltando}`,
          'VALIDATION_ERROR',
          400
        );
      }
      next(error);
    }
  };

  // GET /api/mercado/produtos-pedidos
  obterProdutosPedidos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tipoSupermercado, categoria, limite } = req.query;
      const produtos = await this.mercadoService.obterProdutosPedidosSupermercado(
        tipoSupermercado as string,
        categoria as string,
        limite ? parseInt(limite as string) : 20
      );
      res.json(produtos);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/mercado/produtos-pedidos
  cadastrarProdutoPedido = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = produtoPedidoSupermercadoSchema.parse(req.body);
      const produto = await this.mercadoService.cadastrarProdutoPedidoSupermercado(dados);
      res.status(201).json(produto);
    } catch (error) {
      if (error instanceof ZodError) {
        const camposFaltando = error.errors.map(e => e.path.join('.')).join(', ');
        throw new AppError(
          `Campos inválidos: ${camposFaltando}`,
          'VALIDATION_ERROR',
          400
        );
      }
      next(error);
    }
  };

  // GET /api/mercado/benchmarks
  obterBenchmarks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categoria, tipoMetrica } = req.query;
      const benchmarks = await this.mercadoService.obterBenchmarksSetor(
        categoria as string,
        tipoMetrica as string
      );
      
      // SEMPRE retornar um array para manter compatibilidade com o frontend
      // O frontend espera sempre um array, mesmo que vazio
      res.json(benchmarks);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/mercado/benchmarks
  cadastrarBenchmark = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = benchmarkSetorSchema.parse(req.body);
      const benchmark = await this.mercadoService.cadastrarBenchmarkSetor(dados);
      res.status(201).json(benchmark);
    } catch (error) {
      if (error instanceof ZodError) {
        const camposFaltando = error.errors.map(e => e.path.join('.')).join(', ');
        throw new AppError(
          `Campos inválidos: ${camposFaltando}`,
          'VALIDATION_ERROR',
          400
        );
      }
      next(error);
    }
  };

  // GET /api/mercado/benchmarks/status
  verificarStatusBenchmarks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await this.mercadoService.verificarBenchmarksDisponiveis();
      res.json(status);
    } catch (error) {
      next(error);
    }
  };
}

