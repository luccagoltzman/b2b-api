import { Request, Response, NextFunction } from 'express';
import { PosVendaService } from '../services/posVenda.service';
import { AppError } from '../middleware/errorHandler';
import { z, ZodError } from 'zod';

const analiseSaidaSchema = z.object({
  propostaId: z.string().uuid('propostaId deve ser um UUID válido'),
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  produto: z.string().min(1, 'Produto é obrigatório'),
  marca: z.string().min(1, 'Marca é obrigatória'),
  quantidadeVendida: z.number().positive('Quantidade vendida deve ser um número positivo'),
  periodoAnalise: z.string().min(1, 'Período de análise é obrigatório'),
  observacoes: z.string().optional(),
  posicionamento: z.string().optional(),
  concorrencia: z.string().optional(),
  precoAtual: z.number().positive('Preço atual deve ser um número positivo').optional(),
});

export class PosVendaController {
  private posVendaService: PosVendaService;

  constructor() {
    this.posVendaService = new PosVendaService();
  }

  analisarSaida = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar dados de entrada
      const dados = analiseSaidaSchema.parse(req.body);

      // Gerar análise com IA
      const resultado = await this.posVendaService.analisarSaida(dados);

      res.json(resultado);
    } catch (error: any) {
      console.error('Erro ao analisar saída:', error);

      // Tratar erros específicos
      if (error instanceof ZodError) {
        const camposFaltando = error.errors.map((e) => e.path.join('.')).join(', ');
        throw new AppError(
          `Campos obrigatórios faltando ou inválidos: ${camposFaltando}`,
          'VALIDATION_ERROR',
          400
        );
      }

      if (error instanceof AppError) {
        next(error);
        return;
      }

      if (error.message?.includes('OpenAI')) {
        throw new AppError(
          'Erro ao gerar análise com IA. Verifique a configuração da API OpenAI.',
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

  obterHistorico = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { propostaId } = req.params;

      // Validar UUID
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propostaId)) {
        throw new AppError('propostaId deve ser um UUID válido', 'VALIDATION_ERROR', 400);
      }

      // Buscar histórico
      const historico = await this.posVendaService.obterHistorico(propostaId);

      res.json(historico);
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);

      if (error instanceof AppError) {
        next(error);
        return;
      }

      next(error);
    }
  };
}

