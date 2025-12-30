import { Request, Response, NextFunction } from 'express';
import { AnaliseService } from '../services/analise.service';
import { AppError } from '../middleware/errorHandler';
import { z, ZodError } from 'zod';
import { OpenAIService } from '../services/openai.service';
import { PropostaService } from '../services/proposta.service';

const analiseSchema = z.object({
  tipo: z.enum(['performance', 'concorrencia', 'tendencia', 'oportunidade']),
  dados: z.string().optional(), // Agora é opcional, pois coletamos dados reais automaticamente
});

const propostaGerarSchema = z.object({
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  produto: z.string().min(1, 'Produto é obrigatório'),
  marca: z.string().min(1, 'Marca é obrigatória'),
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
  ]),
  valorUnitario: z.number().positive('Valor unitário deve ser positivo'),
  quantidade: z.number().positive('Quantidade deve ser positiva'),
});

export class AnaliseController {
  private analiseService: AnaliseService;
  private openaiService: OpenAIService;
  private propostaService: PropostaService;

  constructor() {
    this.analiseService = new AnaliseService();
    this.openaiService = OpenAIService.getInstance();
    this.propostaService = new PropostaService();
  }

  gerarAnalise = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tipo, dados } = analiseSchema.parse(req.body);
      // Se dados não forem fornecidos, usamos dados reais do banco automaticamente
      const resultado = await this.analiseService.gerarAnalise(tipo, dados);
      res.json({ resultado });
    } catch (error) {
      next(error);
    }
  };

  gerarPropostaComIA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dadosBasicos = propostaGerarSchema.parse(req.body);
      
      // Gerar proposta completa com IA
      const propostaGerada = await this.openaiService.gerarPropostaCompleta(dadosBasicos);

      // Calcular valor total
      const valorTotal = dadosBasicos.valorUnitario * dadosBasicos.quantidade;
      let valorFinal = valorTotal;

      // Aplicar desconto se fornecido pela IA
      if (propostaGerada.desconto !== undefined && propostaGerada.desconto > 0) {
        if (propostaGerada.descontoTipo === 'percentual') {
          valorFinal = valorTotal * (1 - propostaGerada.desconto / 100);
        } else if (propostaGerada.descontoTipo === 'valor') {
          valorFinal = Math.max(0, valorTotal - propostaGerada.desconto);
        }
      }

      // Arredondar para 2 casas decimais
      valorFinal = Math.round(valorFinal * 100) / 100;

      // Retornar resposta com todos os campos gerados
      res.json({
        categoria: propostaGerada.categoria,
        aliquotaIpi: propostaGerada.aliquotaIpi,
        desconto: propostaGerada.desconto,
        descontoTipo: propostaGerada.descontoTipo,
        condicoesPagamento: propostaGerada.condicoesPagamento,
        prazoEntrega: propostaGerada.prazoEntrega,
        tipoPedido: propostaGerada.tipoPedido,
        transportadora: propostaGerada.transportadora,
        estrategiaRepresentacao: propostaGerada.estrategiaRepresentacao,
        publicoAlvo: propostaGerada.publicoAlvo,
        diferenciaisCompetitivos: propostaGerada.diferenciaisCompetitivos,
        descricao: propostaGerada.descricao,
        observacoes: propostaGerada.observacoes,
        valor: valorFinal,
      });
    } catch (error: any) {
      console.error('Erro ao gerar proposta com IA:', error);
      
      // Tratar erros específicos
      if (error instanceof ZodError) {
        const camposFaltando = error.errors.map(e => e.path.join('.')).join(', ');
        throw new AppError(
          `Campos obrigatórios faltando: ${camposFaltando}`,
          'VALIDATION_ERROR',
          400
        );
      }
      
      if (error.message?.includes('OpenAI')) {
        throw new AppError(
          'Erro ao gerar proposta com IA. Verifique a configuração da API OpenAI.',
          'OPENAI_ERROR',
          500
        );
      }
      
      if (error.message?.includes('JSON')) {
        throw new AppError(
          'Erro ao processar resposta da IA. A resposta não está no formato esperado. Tente novamente.',
          'PARSE_ERROR',
          500
        );
      }
      
      next(error);
    }
  };

  obterInsightsProdutos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const insights = await this.analiseService.obterInsightsProdutos();
      res.json(insights);
    } catch (error) {
      next(error);
    }
  };
}

