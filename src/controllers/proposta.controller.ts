import { Request, Response, NextFunction } from 'express';
import { PropostaService } from '../services/proposta.service';
import { AppError } from '../middleware/errorHandler';
import { z, ZodError } from 'zod';

// Schema base sem refinements (para poder usar .partial())
const propostaSchemaBase = z.object({
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  valor: z.number().nonnegative('Valor deve ser positivo ou zero'),
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
  
  // Campos - Informações do Produto
  produto: z.string().optional(),
  marca: z.string().optional(),
  categoria: z.string().optional(),
  unidadeMedida: z.enum([
    'unidade',
    'kg',
    'g',
    'litro',
    'ml',
    'caixa',
    'pacote',
    'fardo',
    'duzia',
    'metro',
    'outro',
  ]).optional(),
  produtoCodigo: z.string().optional(),
  aliquotaIpi: z.number().min(0, 'Alíquota IPI deve ser maior ou igual a 0').max(100, 'Alíquota IPI deve ser menor ou igual a 100').optional(),
  
  // Campos - Valores e Quantidades
  valorUnitario: z.number().nonnegative('Valor unitário deve ser positivo ou zero').optional(),
  quantidade: z.number().nonnegative('Quantidade deve ser positiva ou zero').optional(),
  desconto: z.number().nonnegative('Desconto deve ser positivo ou zero').optional(),
  descontoTipo: z.enum(['percentual', 'valor']).optional(),
  valorFrete: z.number().nonnegative('Valor do frete deve ser positivo ou zero').optional(),
  
  // Campos - Condições Comerciais
  condicoesPagamento: z.string().optional(),
  prazoEntrega: z.string().optional(),
  tipoPedido: z.enum(['venda', 'cotacao', 'orcamento']).optional(),
  transportadora: z.string().optional(),
  informacoesAdicionais: z.string().optional(),
  
  // Campos - Estratégia de Representação
  estrategiaRepresentacao: z.string().optional(),
  publicoAlvo: z.string().optional(),
  diferenciaisCompetitivos: z.string().optional(),
  
  // Campos - Informações do Cliente
  clienteCnpj: z.string().optional(),
  clienteEndereco: z.string().optional(),
  clienteNumero: z.string().optional(),
  clienteBairro: z.string().optional(),
  clienteCidade: z.string().optional(),
  clienteCep: z.string().optional(),
  clienteEstado: z.string().max(2, 'Estado deve ter no máximo 2 caracteres').optional(),
  clienteTelefone: z.string().optional(),
  clienteEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  clienteNomeFantasia: z.string().optional(),
});

// Schema com validações refinadas (para criação)
const propostaSchema = propostaSchemaBase.refine((data) => {
  // Se desconto for fornecido, descontoTipo também deve ser fornecido
  if (data.desconto !== undefined && data.desconto > 0 && !data.descontoTipo) {
    return false;
  }
  return true;
}, {
  message: 'Se desconto for fornecido, descontoTipo também deve ser fornecido',
  path: ['descontoTipo'],
}).refine((data) => {
  // Validar cálculo de valor se valorUnitario e quantidade forem fornecidos
  // Mas apenas se o usuário forneceu ambos (não obrigatório)
  if (data.valorUnitario !== undefined && data.quantidade !== undefined && 
      data.valorUnitario > 0 && data.quantidade > 0) {
    let valorCalculado = data.valorUnitario * data.quantidade;
    
    if (data.desconto !== undefined && data.desconto > 0 && data.descontoTipo) {
      if (data.descontoTipo === 'percentual') {
        valorCalculado = valorCalculado * (1 - data.desconto / 100);
      } else if (data.descontoTipo === 'valor') {
        valorCalculado = Math.max(0, valorCalculado - data.desconto);
      }
    }
    
    // Permitir diferença de até 0.10 por arredondamento e flexibilidade
    const diferenca = Math.abs(data.valor - valorCalculado);
    if (diferenca > 0.10) {
      return false;
    }
  }
  return true;
}, {
  message: 'O valor fornecido não corresponde ao cálculo esperado. Se fornecer valorUnitario e quantidade, o valor deve ser aproximadamente (valorUnitario × quantidade - desconto).',
  path: ['valor'],
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

// Schema para atualização (todos os campos opcionais, sem validações refinadas)
const propostaUpdateSchema = propostaSchemaBase.partial();

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

