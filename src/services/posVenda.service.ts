import { OpenAIService } from './openai.service';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export interface AnaliseSaidaRequest {
  propostaId: string;
  cliente: string;
  produto: string;
  marca: string;
  quantidadeVendida: number;
  periodoAnalise: string;
  observacoes?: string;
  posicionamento?: string;
  concorrencia?: string;
  precoAtual?: number;
}

export interface AcaoSugerida {
  acao: string;
  prioridade: 'alta' | 'media' | 'baixa';
  prazo: string;
}

export interface AnaliseSaidaResponse {
  statusSaida: 'boa' | 'regular' | 'ruim';
  analise: string;
  pontosPositivos: string[];
  pontosNegativos: string[];
  recomendacoes: string[];
  acoesSugeridas: AcaoSugerida[];
}

export class PosVendaService {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = OpenAIService.getInstance();
  }

  async validarProposta(propostaId: string): Promise<void> {
    const proposta = await prisma.proposta.findUnique({
      where: { id: propostaId },
    });

    if (!proposta) {
      throw new AppError('Proposta não encontrada', 'NOT_FOUND', 404);
    }

    // Verificar se a proposta está aprovada
    const statusAprovado = ['aprovada', 'aprovado'].includes(proposta.status.toLowerCase());
    if (!statusAprovado) {
      throw new AppError(
        'Apenas propostas aprovadas podem ser analisadas',
        'INVALID_STATUS',
        400
      );
    }
  }

  async analisarSaida(dados: AnaliseSaidaRequest): Promise<AnaliseSaidaResponse> {
    // Validar que a proposta existe e está aprovada
    await this.validarProposta(dados.propostaId);

    // Construir prompt para a IA
    const prompt = this.construirPrompt(dados);

    // Chamar OpenAI
    const respostaIA = await this.openaiService.gerarAnaliseSaida(prompt);

    // Validar resposta da IA
    const resultado = this.validarRespostaIA(respostaIA);

    // Salvar análise no banco de dados
    await this.salvarAnalise(dados, resultado);

    return resultado;
  }

  private async salvarAnalise(
    dados: AnaliseSaidaRequest,
    resultado: AnaliseSaidaResponse
  ): Promise<void> {
    try {
      await prisma.analiseSaida.create({
        data: {
          propostaId: dados.propostaId,
          dataAnalise: new Date(),
          quantidadeVendida: dados.quantidadeVendida,
          periodoAnalise: dados.periodoAnalise,
          statusSaida: resultado.statusSaida,
          analise: resultado.analise,
          pontosPositivos: JSON.stringify(resultado.pontosPositivos),
          pontosNegativos: JSON.stringify(resultado.pontosNegativos),
          recomendacoes: JSON.stringify(resultado.recomendacoes),
          acoesSugeridas: JSON.stringify(resultado.acoesSugeridas),
          observacoes: dados.observacoes,
          posicionamento: dados.posicionamento,
          concorrencia: dados.concorrencia,
          precoAtual: dados.precoAtual,
        },
      });
    } catch (error: any) {
      console.error('Erro ao salvar análise no banco de dados:', error);
      // Não lançar erro para não interromper o fluxo, apenas logar
      // A análise já foi gerada e retornada ao usuário
    }
  }

  async obterHistorico(propostaId: string): Promise<any[]> {
    // Validar que a proposta existe
    const proposta = await prisma.proposta.findUnique({
      where: { id: propostaId },
    });

    if (!proposta) {
      throw new AppError('Proposta não encontrada', 'NOT_FOUND', 404);
    }

    // Buscar análises ordenadas por data (mais recente primeiro)
    const analises = await prisma.analiseSaida.findMany({
      where: { propostaId },
      orderBy: { dataAnalise: 'desc' },
    });

    // Converter para formato esperado pelo frontend
    return analises.map((analise) => ({
      id: analise.id,
      propostaId: analise.propostaId,
      dataAnalise: analise.dataAnalise.toISOString(),
      quantidadeVendida: analise.quantidadeVendida,
      periodoAnalise: analise.periodoAnalise,
      statusSaida: analise.statusSaida,
      analise: analise.analise,
      pontosPositivos: JSON.parse(analise.pontosPositivos),
      pontosNegativos: JSON.parse(analise.pontosNegativos),
      recomendacoes: JSON.parse(analise.recomendacoes),
      acoesSugeridas: JSON.parse(analise.acoesSugeridas),
      observacoes: analise.observacoes || undefined,
      posicionamento: analise.posicionamento || undefined,
      concorrencia: analise.concorrencia || undefined,
      precoAtual: analise.precoAtual || undefined,
    }));
  }

  private construirPrompt(dados: AnaliseSaidaRequest): string {
    return `Você é um especialista em análise de vendas e comportamento do consumidor no varejo, 
especialmente em supermercados. Sua tarefa é analisar a saída de um produto específico 
e fornecer insights acionáveis.

PRODUTO A ANALISAR:
- Cliente: ${dados.cliente}
- Produto: ${dados.produto}
- Marca: ${dados.marca}
- Quantidade Vendida: ${dados.quantidadeVendida} unidades
- Período: ${dados.periodoAnalise}
${dados.precoAtual ? `- Preço Atual: R$ ${dados.precoAtual.toFixed(2)}` : ''}
${dados.posicionamento ? `- Posicionamento: ${dados.posicionamento}` : ''}
${dados.concorrencia ? `- Concorrência: ${dados.concorrencia}` : ''}
${dados.observacoes ? `- Observações: ${dados.observacoes}` : ''}

TAREFAS:

1. AVALIAR O STATUS DA SAÍDA:
   - Compare a quantidade vendida com expectativas razoáveis para o tipo de produto, 
     período e cliente
   - Classifique como: "boa" (acima ou dentro do esperado), "regular" (próximo ao esperado 
     mas com margem de melhoria), ou "ruim" (abaixo do esperado)

2. ANÁLISE GERAL:
   - Forneça uma análise completa e detalhada (2-4 parágrafos) sobre:
     * Desempenho atual do produto
     * Fatores que podem estar influenciando a saída
     * Comparação com benchmarks do setor (quando aplicável)
     * Impacto do posicionamento, preço e concorrência

3. PONTOS POSITIVOS:
   - Liste 2-4 pontos positivos identificados
   - Exemplos: boa localização, preço competitivo, boa visibilidade, etc.

4. PONTOS DE ATENÇÃO (Pontos Negativos):
   - Liste 2-4 pontos que precisam de atenção
   - Exemplos: preço alto, posicionamento ruim, concorrência forte, falta de visibilidade, etc.

5. RECOMENDAÇÕES:
   - Forneça 3-5 recomendações gerais para melhorar a saída
   - Seja específico e acionável
   - Exemplos: "Negociar melhor posicionamento na gôndola", "Ajustar preço para ficar mais competitivo", etc.

6. AÇÕES SUGERIDAS:
   - Liste 4-6 ações específicas e práticas
   - Cada ação deve ter:
     * Descrição clara e acionável
     * Prioridade: "alta" (impacto imediato), "media" (impacto médio prazo), "baixa" (melhorias incrementais)
     * Prazo sugerido: "Imediato", "7 dias", "15 dias", "30 dias", etc.

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido no seguinte formato:
{
  "statusSaida": "boa|regular|ruim",
  "analise": "texto completo da análise (2-4 parágrafos)",
  "pontosPositivos": ["ponto 1", "ponto 2", ...],
  "pontosNegativos": ["ponto 1", "ponto 2", ...],
  "recomendacoes": ["recomendação 1", "recomendação 2", ...],
  "acoesSugeridas": [
    {
      "acao": "descrição da ação",
      "prioridade": "alta|media|baixa",
      "prazo": "prazo sugerido"
    },
    ...
  ]
}

IMPORTANTE:
- Seja objetivo e prático
- Foque em ações acionáveis
- Considere o contexto do varejo/supermercado
- Use conhecimento sobre comportamento do consumidor
- Seja específico nas recomendações`;
  }

  private validarRespostaIA(respostaIA: any): AnaliseSaidaResponse {
    // Validar campos obrigatórios
    if (!respostaIA.statusSaida || !respostaIA.analise) {
      throw new AppError(
        'Resposta da IA inválida: campos obrigatórios faltando',
        'INVALID_AI_RESPONSE',
        500
      );
    }

    // Validar statusSaida
    const statusValidos = ['boa', 'regular', 'ruim'];
    if (!statusValidos.includes(respostaIA.statusSaida)) {
      throw new AppError(
        `Status de saída inválido: ${respostaIA.statusSaida}. Deve ser: ${statusValidos.join(', ')}`,
        'INVALID_AI_RESPONSE',
        500
      );
    }

    // Validar arrays
    if (!Array.isArray(respostaIA.pontosPositivos)) {
      respostaIA.pontosPositivos = [];
    }
    if (!Array.isArray(respostaIA.pontosNegativos)) {
      respostaIA.pontosNegativos = [];
    }
    if (!Array.isArray(respostaIA.recomendacoes)) {
      respostaIA.recomendacoes = [];
    }
    if (!Array.isArray(respostaIA.acoesSugeridas)) {
      respostaIA.acoesSugeridas = [];
    }

    // Validar ações sugeridas
    const acoesValidadas = respostaIA.acoesSugeridas
      .filter((acao: any) => acao && acao.acao && acao.prioridade && acao.prazo)
      .map((acao: any) => {
        const prioridadesValidas = ['alta', 'media', 'baixa'];
        return {
          acao: acao.acao,
          prioridade: prioridadesValidas.includes(acao.prioridade) ? acao.prioridade : 'media',
          prazo: acao.prazo,
        };
      });

    return {
      statusSaida: respostaIA.statusSaida,
      analise: respostaIA.analise,
      pontosPositivos: respostaIA.pontosPositivos,
      pontosNegativos: respostaIA.pontosNegativos,
      recomendacoes: respostaIA.recomendacoes,
      acoesSugeridas: acoesValidadas,
    };
  }
}

