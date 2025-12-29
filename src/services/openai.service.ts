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
  performance: `Você é um consultor especializado em análise de performance comercial B2B para representantes que negociam com grandes redes de supermercados. 

CONTEXTO: Você está analisando dados reais de um representante comercial que trabalha no setor de fornecimento para supermercados. Sua análise deve ser prática, acionável e baseada EXCLUSIVAMENTE nos dados fornecidos.

DADOS DO SISTEMA:
{dados}

INSTRUÇÕES:
- Analise APENAS os dados fornecidos acima
- Seja específico e cite números, clientes e valores mencionados nos dados
- Foque em ações práticas que o representante pode tomar AGORA
- Evite generalizações genéricas sobre o mercado de sorvetes ou produtos
- Se não houver dados suficientes em alguma área, mencione isso claramente

Forneça uma análise estruturada e acionável com:
1. RESUMO EXECUTIVO (2-3 frases sobre a situação atual)
2. PONTOS FORTES (cite exemplos específicos dos dados: clientes, valores, conversões)
3. ÁREAS DE MELHORIA (identifique problemas reais baseados nos números)
4. RECOMENDAÇÕES PRIORITÁRIAS (3-5 ações específicas com base nos dados)
5. MÉTRICAS-CHAVE (destaque os números mais importantes e o que significam)

IMPORTANTE: Não invente dados ou faça suposições genéricas. Use apenas o que está nos dados fornecidos.`,

  concorrencia: `Você é um consultor especializado em análise competitiva B2B para representantes comerciais que negociam com redes de supermercados.

CONTEXTO: Você está analisando dados reais de um representante comercial. Sua análise deve comparar o desempenho atual com benchmarks do setor e identificar vantagens competitivas.

DADOS DO SISTEMA:
{dados}

INSTRUÇÕES:
- Use os dados fornecidos para fazer comparações realistas
- Cite números específicos do representante
- Compare com benchmarks típicos do setor (taxa de conversão média, ticket médio, etc.)
- Seja prático e acionável

Forneça uma análise comparativa incluindo:
1. POSICIONAMENTO ATUAL (onde o representante está em relação ao mercado)
2. COMPARAÇÃO COM BENCHMARKS (use os números reais vs. médias do setor)
3. VANTAGENS COMPETITIVAS (o que está funcionando bem baseado nos dados)
4. GAPS COMPETITIVOS (onde precisa melhorar)
5. ESTRATÉGIAS DE DIFERENCIAÇÃO (ações específicas para se destacar)

IMPORTANTE: Baseie-se nos dados reais fornecidos, não em suposições genéricas.`,

  tendencia: `Você é um analista de tendências especializado em representação comercial B2B para supermercados.

CONTEXTO: Analise os dados históricos reais fornecidos para identificar padrões, tendências e projeções baseadas no comportamento atual do representante.

DADOS DO SISTEMA:
{dados}

INSTRUÇÕES:
- Identifique padrões REAIS nos dados fornecidos (ex: quais clientes compram mais, quando há mais visitas, etc.)
- Projete tendências baseadas no histórico REAL, não em suposições genéricas
- Foque em padrões de comportamento do representante e seus clientes
- Seja específico sobre o que os dados mostram

Forneça uma análise de tendências incluindo:
1. PADRÕES IDENTIFICADOS (o que os dados mostram sobre comportamento, sazonalidade, etc.)
2. TENDÊNCIAS EMERGENTES (baseadas no histórico real do representante)
3. PROJEÇÕES (o que pode acontecer nos próximos meses baseado nos dados atuais)
4. OPORTUNIDADES DE CRESCIMENTO (identificadas a partir dos padrões reais)
5. AÇÕES RECOMENDADAS (como capitalizar nas tendências identificadas)

IMPORTANTE: Analise os dados reais fornecidos. Não faça análises genéricas sobre o mercado de sorvetes ou produtos alimentícios.`,

  oportunidade: `Você é um consultor estratégico especializado em identificar oportunidades de negócio B2B para representantes comerciais.

CONTEXTO: Analise os dados reais do representante para identificar oportunidades específicas e acionáveis baseadas no histórico real de clientes, propostas e visitas.

DADOS DO SISTEMA:
{dados}

INSTRUÇÕES:
- Identifique oportunidades REAIS baseadas nos dados (ex: clientes com potencial não explorado, propostas pendentes que precisam de follow-up, etc.)
- Seja específico: cite nomes de clientes, valores, prazos
- Priorize oportunidades por viabilidade e impacto
- Foque em ações imediatas que o representante pode tomar

Forneça uma análise de oportunidades incluindo:
1. OPORTUNIDADES IMEDIATAS (ações que podem ser tomadas esta semana - cite clientes e valores específicos)
2. OPORTUNIDADES DE MÉDIO PRAZO (próximos 30-60 dias baseadas nos dados)
3. CLIENTES COM MAIOR POTENCIAL (identifique nos dados quais clientes merecem mais atenção)
4. AÇÕES ESPECÍFICAS (para cada oportunidade, diga exatamente o que fazer)
5. PRIORIZAÇÃO (ordene por impacto e facilidade de execução)

IMPORTANTE: Use os dados reais. Cite clientes específicos, valores e prazos mencionados nos dados. Não faça recomendações genéricas.`,
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

