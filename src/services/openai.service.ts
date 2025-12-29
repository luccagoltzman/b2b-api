import OpenAI from 'openai';
import dotenv from 'dotenv';
import { config } from '../config/env';

// Função para obter instância do OpenAI com a chave atual
const getOpenAI = (): OpenAI | null => {
  // Recarrega variáveis de ambiente
  dotenv.config();
  const apiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;
  if (!apiKey || apiKey === 'sua_chave_api_openai_aqui') {
    return null;
  }
  return new OpenAI({ apiKey });
};

const PROMPTS = {
  performance: `Você é um especialista em análise comercial B2B. Analise os seguintes dados de um representante comercial que negocia com redes de supermercados e forneça insights acionáveis sobre performance, pontos fortes, áreas de melhoria e recomendações estratégicas.

Dados fornecidos:
{dados}

Forneça uma análise detalhada e estruturada com:
1. Resumo executivo da performance
2. Pontos fortes identificados
3. Áreas que precisam de melhoria
4. Recomendações estratégicas específicas
5. Métricas e KPIs relevantes`,

  concorrencia: `Você é um especialista em análise de mercado e concorrência B2B. Analise os seguintes dados comparando o desempenho com o mercado e concorrentes no setor de representação comercial para redes de supermercados.

Dados fornecidos:
{dados}

Forneça uma análise comparativa incluindo:
1. Posicionamento no mercado
2. Comparação com benchmarks do setor
3. Vantagens competitivas identificadas
4. Ameaças e desafios competitivos
5. Estratégias para ganhar vantagem competitiva`,

  tendencia: `Você é um analista de tendências de mercado B2B. Analise os seguintes dados para identificar padrões, tendências futuras e oportunidades de crescimento no setor de representação comercial para redes de supermercados.

Dados fornecidos:
{dados}

Forneça uma análise de tendências incluindo:
1. Padrões identificados nos dados históricos
2. Tendências de mercado emergentes
3. Projeções e previsões baseadas nos dados
4. Oportunidades de crescimento futuro
5. Recomendações para capitalizar nas tendências identificadas`,

  oportunidade: `Você é um consultor estratégico especializado em identificar oportunidades de negócio B2B. Analise os seguintes dados de um representante comercial que negocia com redes de supermercados e identifique oportunidades específicas e acionáveis.

Dados fornecidos:
{dados}

Forneça uma análise de oportunidades incluindo:
1. Oportunidades imediatas identificadas
2. Oportunidades de médio e longo prazo
3. Clientes ou segmentos com maior potencial
4. Produtos ou serviços com maior oportunidade
5. Ações específicas recomendadas para cada oportunidade
6. Priorização das oportunidades por impacto e viabilidade`,
};

export class OpenAIService {
  private static instance: OpenAIService;

  private constructor() {}

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  async gerarAnalise(
    tipo: 'performance' | 'concorrencia' | 'tendencia' | 'oportunidade',
    dados: string
  ): Promise<string> {
    const openai = getOpenAI();
    if (!openai) {
      throw new Error('OpenAI API não configurada. Configure OPENAI_API_KEY no arquivo .env');
    }

    const prompt = PROMPTS[tipo].replace('{dados}', dados);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em análise comercial B2B para representantes que negociam com redes de supermercados. Forneça análises detalhadas, acionáveis e baseadas em dados.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      return completion.choices[0]?.message?.content || 'Não foi possível gerar a análise.';
    } catch (error: any) {
      console.error('Erro ao gerar análise com OpenAI:', error);
      throw new Error(`Erro ao gerar análise: ${error.message || 'Erro desconhecido'}`);
    }
  }

  async gerarProposta(dadosBasicos: {
    cliente: string;
    valor?: number;
    contexto?: string;
  }): Promise<{
    descricao: string;
    observacoes?: string;
    valorSugerido?: number;
  }> {
    const openai = getOpenAI();
    if (!openai) {
      throw new Error('OpenAI API não configurada. Configure OPENAI_API_KEY no arquivo .env');
    }

    const prompt = `Você é um especialista em criação de propostas comerciais B2B para representantes que negociam com redes de supermercados.

Com base nos seguintes dados básicos, crie uma proposta comercial completa e profissional:

Cliente: ${dadosBasicos.cliente}
${dadosBasicos.valor ? `Valor mencionado: R$ ${dadosBasicos.valor.toFixed(2)}` : ''}
${dadosBasicos.contexto ? `Contexto: ${dadosBasicos.contexto}` : ''}

Forneça:
1. Uma descrição detalhada e persuasiva da proposta (máximo 500 palavras)
2. Observações relevantes sobre a proposta
3. Se não foi fornecido valor, sugira um valor baseado no contexto

Responda em formato JSON com as chaves: descricao, observacoes (opcional), valorSugerido (opcional, apenas se não foi fornecido valor).`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em criar propostas comerciais B2B profissionais. Sempre responda em formato JSON válido.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      return {
        descricao: parsed.descricao || 'Proposta comercial gerada automaticamente.',
        observacoes: parsed.observacoes,
        valorSugerido: parsed.valorSugerido,
      };
    } catch (error: any) {
      console.error('Erro ao gerar proposta com OpenAI:', error);
      throw new Error(`Erro ao gerar proposta: ${error.message || 'Erro desconhecido'}`);
    }
  }
}

