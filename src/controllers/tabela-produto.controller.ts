import { Request, Response, NextFunction } from 'express';
import { TabelaProdutoService } from '../services/tabela-produto.service';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

// Schema de validação para produto
const produtoSchema = z.object({
  produto: z.string().min(1, 'Nome do produto é obrigatório'),
  produtoCodigo: z.string().optional(),
  marca: z.string().min(1, 'Marca é obrigatória'),
  categoria: z.string().optional(),
  unidadeMedida: z.string().min(1, 'Unidade de medida é obrigatória'),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  valorUnitario: z.number().positive('Valor unitário deve ser maior que zero'),
  aliquotaIpi: z.number().min(0).max(100).optional(),
  desconto: z.number().nonnegative('Desconto não pode ser negativo').optional(),
  descontoTipo: z.enum(['percentual', 'valor']).optional(),
});

// Schema de validação para criação de tabela
const clienteSchema = z.union([
  z.string().min(1, 'Nome do cliente é obrigatório'),
  z.object({
    nome: z.string().min(1, 'Nome do cliente é obrigatório'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    telefone: z.string().optional(),
  }),
]);

const criarTabelaSchema = z.object({
  nome: z.string().min(1, 'Nome da tabela é obrigatório'),
  clientes: z.array(clienteSchema).min(1, 'Pelo menos um cliente é obrigatório'),
  produtos: z.array(produtoSchema).min(1, 'Pelo menos um produto é obrigatório'),
  condicoesPagamento: z.string().optional(),
  prazoEntrega: z.string().optional(),
  observacoes: z.string().optional(),
  dataVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Data deve estar no formato YYYY-MM-DD'),
  representanteId: z.string().optional(),
});

// Schema de validação para atualização de tabela
const atualizarTabelaSchema = criarTabelaSchema.partial();

// Schema de validação para envio de tabela
const enviarTabelaSchema = z.object({
  clientes: z.array(z.string()).optional(),
  metodo: z.enum(['email', 'whatsapp', 'manual']).optional(),
  configuracao: z
    .object({
      email: z
        .object({
          assunto: z.string().optional(),
          corpo: z.string().optional(),
        })
        .optional(),
      whatsapp: z
        .object({
          mensagem: z.string().optional(),
        })
        .optional(),
      arquivoPdfUrl: z.string().url().optional(),
      arquivoExcelUrl: z.string().url().optional(),
    })
    .optional(),
});

// Schema de validação para geração de proposta (Simular Retorno)
const gerarPropostaSchema = z.object({
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  selecoes: z
    .array(
      z.object({
        produtoId: z.string().min(1, 'ID do produto é obrigatório'),
        quantidade: z.number().positive('Quantidade deve ser maior que zero').optional(),
        selecionado: z.boolean().optional(),
      })
    )
    .min(1, 'Selecione pelo menos um produto'),
});

export class TabelaProdutoController {
  private tabelaProdutoService: TabelaProdutoService;

  constructor() {
    this.tabelaProdutoService = new TabelaProdutoService();
  }

  /**
   * GET /api/tabelas-produtos
   * Lista todas as tabelas de produtos
   */
  listar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const representanteId = req.query.representanteId as string | undefined;
      const tabelas = await this.tabelaProdutoService.listar(representanteId);
      res.json(tabelas);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/tabelas-produtos/:id
   * Retorna detalhes de uma tabela específica
   */
  buscarPorId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tabela = await this.tabelaProdutoService.buscarPorId(id);

      if (!tabela) {
        throw new AppError('Tabela não encontrada', 'NOT_FOUND', 404);
      }

      res.json(tabela);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/tabelas-produtos
   * Cria uma nova tabela de produtos
   */
  criar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dados = criarTabelaSchema.parse(req.body);
      const tabela = await this.tabelaProdutoService.criar(dados);
      res.status(201).json(tabela);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/tabelas-produtos/:id
   * Atualiza uma tabela existente
   */
  atualizar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const dados = atualizarTabelaSchema.parse(req.body);

      const tabelaExistente = await this.tabelaProdutoService.buscarPorId(id);
      if (!tabelaExistente) {
        throw new AppError('Tabela não encontrada', 'NOT_FOUND', 404);
      }

      const tabela = await this.tabelaProdutoService.atualizar(id, dados);
      res.json(tabela);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/tabelas-produtos/:id
   * Deleta uma tabela
   */
  deletar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const tabelaExistente = await this.tabelaProdutoService.buscarPorId(id);
      if (!tabelaExistente) {
        throw new AppError('Tabela não encontrada', 'NOT_FOUND', 404);
      }

      await this.tabelaProdutoService.deletar(id);
      res.json({ message: 'Tabela deletada com sucesso' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/tabelas-produtos/:id/enviar
   * Marca a tabela como enviada e cria registros de envio
   */
  enviar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { clientes, metodo, configuracao } = enviarTabelaSchema.parse(req.body);

      const resultado = await this.tabelaProdutoService.enviar(id, clientes, metodo, configuracao);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/tabelas-produtos/:id/gerar-proposta
   * Gera uma proposta definitiva baseada na seleção do cliente
   */
  gerarProposta = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { cliente, selecoes } = gerarPropostaSchema.parse(req.body);

      const resultado = await this.tabelaProdutoService.gerarProposta(id, cliente, selecoes);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  };
}
