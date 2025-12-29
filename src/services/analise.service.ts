import { OpenAIService } from './openai.service';
import { prisma } from '../lib/prisma';

export class AnaliseService {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = OpenAIService.getInstance();
  }

  async gerarAnalise(
    tipo: 'performance' | 'concorrencia' | 'tendencia' | 'oportunidade',
    dados: string
  ): Promise<string> {
    const resultado = await this.openaiService.gerarAnalise(tipo, dados);

    // Criar atividade
    await prisma.atividade.create({
      data: {
        type: 'analise',
        description: `Análise de ${tipo} gerada`,
        status: 'concluida',
      },
    });

    return resultado;
  }
}

