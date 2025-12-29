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

  async gerarPropostaCompleta(dadosBasicos: {
    cliente: string;
    produto: string;
    marca: string;
    unidadeMedida: string;
    valorUnitario: number;
    quantidade: number;
  }): Promise<{
    categoria: string;
    aliquotaIpi: number; // OBRIGATÓRIO - calculado automaticamente
    desconto?: number;
    descontoTipo?: 'percentual' | 'valor';
    condicoesPagamento: string;
    prazoEntrega: string;
    tipoPedido?: string;
    transportadora?: string;
    estrategiaRepresentacao: string;
    publicoAlvo: string;
    diferenciaisCompetitivos: string;
    descricao: string;
    observacoes: string;
  }> {
    const openai = getOpenAI();
    if (!openai) {
      throw new Error('OpenAI API não configurada. Configure OPENAI_API_KEY no arquivo .env');
    }

    const valorTotal = dadosBasicos.valorUnitario * dadosBasicos.quantidade;

    const prompt = `Você é um especialista em propostas comerciais B2B para representantes comerciais que negociam com grandes redes de supermercados.

Com base nas seguintes informações básicas, gere uma proposta comercial completa e profissional:

INFORMAÇÕES BÁSICAS:
- Cliente: ${dadosBasicos.cliente}
- Produto: ${dadosBasicos.produto}
- Marca: ${dadosBasicos.marca}
- Unidade de Medida: ${dadosBasicos.unidadeMedida}
- Valor Unitário: R$ ${dadosBasicos.valorUnitario.toFixed(2)}
- Quantidade: ${dadosBasicos.quantidade}
- Valor Total (sem desconto): R$ ${valorTotal.toFixed(2)}

INSTRUÇÕES:
1. Categoria do Produto: Identifique e sugira a categoria mais adequada (ex: Alimentos, Bebidas, Limpeza, Higiene, Eletrodomésticos, Filtros, etc)

2. Alíquota IPI (OBRIGATÓRIO): Calcule a alíquota IPI correta baseada no produto, marca e categoria. Considere:
   - Eletrodomésticos: geralmente 5-15% (ex: geladeiras, fogões, máquinas de lavar)
   - Filtros e purificadores: geralmente 2-5% (ex: filtros de água, purificadores)
   - Alimentos básicos: geralmente 0-5% (ex: arroz, feijão, açúcar)
   - Bebidas: geralmente 5-20% (ex: refrigerantes, sucos, cervejas)
   - Produtos de limpeza: geralmente 2-10% (ex: detergentes, sabões)
   - Produtos farmacêuticos: geralmente 0-10% (ex: medicamentos, suplementos)
   - Produtos de higiene pessoal: geralmente 2-8% (ex: sabonetes, shampoos)
   - Outros produtos: pesquise a alíquota específica baseada na NCM (Nomenclatura Comum do Mercosul)
   IMPORTANTE: Retorne a alíquota como número decimal (ex: 2.6 para 2.6%, 15.0 para 15%)

3. Desconto: Sugira um desconto competitivo e estratégico (percentual ou valor fixo) que seja atraente mas mantenha margem de lucro. Justifique a escolha.

4. Condições de Pagamento: Sugira condições comerciais atrativas e competitivas para o mercado B2B (ex: "30/60/90 dias", "Boleto à vista com desconto", etc)

5. Prazo de Entrega: Sugira um prazo realista e competitivo baseado no tipo de produto e quantidade

6. Tipo de Pedido: Sugira o tipo de pedido mais adequado (geralmente "venda", mas pode ser "cotacao" ou "orcamento" dependendo do contexto)

7. Transportadora: Sugira a transportadora ou tipo de transporte (ex: "CIF", "FOB", "Transportadora X")

8. Estratégia de Representação: Crie uma estratégia completa e detalhada (3-5 parágrafos) incluindo:
   - Ações promocionais sugeridas
   - Parcerias e eventos
   - Material de PDV (Ponto de Venda)
   - Treinamento de equipe
   - Campanhas sazonais (se aplicável)
   - Outras ações estratégicas relevantes

9. Público-Alvo: Identifique o público-alvo ideal para este produto (ex: "Famílias classe A/B", "Jovens adultos", etc)

10. Diferenciais Competitivos: Liste os principais diferenciais deste produto em relação à concorrência (5-7 itens separados por vírgula)

11. Descrição: Crie uma descrição completa e profissional da proposta (2-3 parágrafos) destacando:
   - O produto e sua qualidade
   - A oportunidade de negócio
   - Benefícios para o cliente
   - Potencial de crescimento

12. Observações: Inclua observações importantes, avisos sobre valores, recomendações estratégicas e alertas relevantes (use ⚠️ para avisos importantes)

IMPORTANTE:
- Seja específico e profissional
- Use linguagem comercial adequada para B2B
- Considere o contexto de grandes redes de supermercados
- Sugira valores e estratégias realistas
- Destaque oportunidades e riscos quando relevante
- Formate a resposta em JSON estruturado

Retorne APENAS um JSON válido com a seguinte estrutura:
{
  "categoria": "string",
  "aliquotaIpi": number (OBRIGATÓRIO - alíquota IPI calculada baseada no produto, ex: 2.6 para 2.6%),
  "desconto": number (opcional, se não sugerir desconto omita este campo),
  "descontoTipo": "percentual" ou "valor" (obrigatório se desconto for fornecido),
  "condicoesPagamento": "string",
  "prazoEntrega": "string",
  "tipoPedido": "venda" ou "cotacao" ou "orcamento" (opcional, padrão: "venda"),
  "transportadora": "string (opcional, ex: 'CIF', 'FOB', ou nome da transportadora)",
  "estrategiaRepresentacao": "string (texto completo)",
  "publicoAlvo": "string",
  "diferenciaisCompetitivos": "string (texto completo com itens separados por vírgula)",
  "descricao": "string (texto completo)",
  "observacoes": "string (texto completo com avisos)"
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em propostas comerciais B2B para representantes que negociam com grandes redes de supermercados. Sempre responda APENAS com JSON válido, sem texto adicional antes ou depois do JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content || '{}';
      
      // Tentar extrair JSON se houver texto adicional
      let jsonContent = content.trim();
      
      // Remover markdown code blocks se existirem
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }
      
      // Tentar encontrar JSON no conteúdo
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonContent);

      // Validar campos obrigatórios
      if (!parsed.categoria || parsed.aliquotaIpi === undefined || parsed.aliquotaIpi === null ||
          !parsed.condicoesPagamento || !parsed.prazoEntrega || 
          !parsed.estrategiaRepresentacao || !parsed.publicoAlvo || 
          !parsed.diferenciaisCompetitivos || !parsed.descricao || !parsed.observacoes) {
        throw new Error('Resposta da IA incompleta. Alguns campos obrigatórios estão faltando.');
      }

      // Validar alíquota IPI
      if (parsed.aliquotaIpi < 0 || parsed.aliquotaIpi > 100) {
        throw new Error('Alíquota IPI inválida. Deve estar entre 0 e 100.');
      }

      // Validar desconto se fornecido
      if (parsed.desconto !== undefined && parsed.desconto > 0 && !parsed.descontoTipo) {
        parsed.descontoTipo = 'percentual'; // Padrão se não especificado
      }

      return {
        categoria: parsed.categoria,
        aliquotaIpi: parsed.aliquotaIpi,
        desconto: parsed.desconto,
        descontoTipo: parsed.descontoTipo,
        condicoesPagamento: parsed.condicoesPagamento,
        prazoEntrega: parsed.prazoEntrega,
        tipoPedido: parsed.tipoPedido || 'venda',
        transportadora: parsed.transportadora,
        estrategiaRepresentacao: parsed.estrategiaRepresentacao,
        publicoAlvo: parsed.publicoAlvo,
        diferenciaisCompetitivos: parsed.diferenciaisCompetitivos,
        descricao: parsed.descricao,
        observacoes: parsed.observacoes,
      };
    } catch (error: any) {
      console.error('Erro ao gerar proposta completa com OpenAI:', error);
      
      if (error instanceof SyntaxError || error.message?.includes('JSON')) {
        throw new Error('Erro ao processar resposta da IA: formato JSON inválido');
      }
      
      throw new Error(`Erro ao gerar proposta: ${error.message || 'Erro desconhecido'}`);
    }
  }
}

