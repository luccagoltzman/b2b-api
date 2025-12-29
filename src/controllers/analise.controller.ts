import { Request, Response, NextFunction } from 'express';
import { AnaliseService } from '../services/analise.service';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { OpenAIService } from '../services/openai.service';
import { PropostaService } from '../services/proposta.service';

const analiseSchema = z.object({
  tipo: z.enum(['performance', 'concorrencia', 'tendencia', 'oportunidade']),
  dados: z.string().min(1, 'Dados são obrigatórios'),
});

const propostaGerarSchema = z.object({
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  valor: z.number().positive().optional(),
  contexto: z.string().optional(),
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
      const resultado = await this.analiseService.gerarAnalise(tipo, dados);
      res.json({ resultado });
    } catch (error) {
      next(error);
    }
  };

  gerarPropostaComIA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dadosBasicos = propostaGerarSchema.parse(req.body);
      const propostaGerada = await this.openaiService.gerarProposta(dadosBasicos);

      // Se foi fornecido valor, usar ele; caso contrário, usar o sugerido pela IA
      const valorFinal = dadosBasicos.valor || propostaGerada.valorSugerido || 0;

      // Criar a proposta no banco de dados
      const proposta = await this.propostaService.criar({
        cliente: dadosBasicos.cliente,
        valor: valorFinal,
        status: 'pendente',
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias a partir de hoje
        descricao: propostaGerada.descricao,
        observacoes: propostaGerada.observacoes,
      });

      res.status(201).json({
        proposta,
        sugestoesIA: {
          valorSugerido: propostaGerada.valorSugerido,
          observacoes: propostaGerada.observacoes,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

