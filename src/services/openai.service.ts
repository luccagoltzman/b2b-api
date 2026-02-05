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
- **USE OS DADOS DE MERCADO** (preços, produtos mais vendidos, benchmarks) para fazer comparações inteligentes e recomendações baseadas em dados reais do mercado
- Compare os preços das propostas com os preços de mercado fornecidos
- Identifique oportunidades baseadas nos produtos mais vendidos/pedidos
- Use benchmarks do setor para avaliar performance
- Foque em ações práticas que o representante pode tomar AGORA
- Se não houver dados suficientes em alguma área, mencione isso claramente

Forneça uma análise estruturada e acionável com:
1. RESUMO EXECUTIVO (2-3 frases sobre a situação atual, incluindo comparação com mercado quando relevante)
2. PONTOS FORTES (cite exemplos específicos dos dados: clientes, valores, conversões, comparações com mercado)
3. ÁREAS DE MELHORIA (identifique problemas reais baseados nos números e comparações com benchmarks)
4. OPORTUNIDADES DE MERCADO (identifique produtos/categorias com alta demanda baseado nos dados de mercado)
5. RECOMENDAÇÕES PRIORITÁRIAS (3-5 ações específicas com base nos dados e dados de mercado)
6. MÉTRICAS-CHAVE (destaque os números mais importantes, comparando com benchmarks quando disponível)

IMPORTANTE: 
- Use os dados de mercado para enriquecer sua análise, mas não invente dados
- Faça comparações inteligentes entre performance atual e dados de mercado
- Seja específico: cite produtos, preços, regiões mencionados nos dados de mercado`,

  concorrencia: `Você é um consultor especializado em análise competitiva B2B para representantes comerciais que negociam com redes de supermercados.

CONTEXTO: Você está analisando dados reais de um representante comercial. Sua análise deve comparar o desempenho atual com benchmarks do setor e identificar vantagens competitivas.

DADOS DO SISTEMA:
{dados}

INSTRUÇÕES:
- Use os dados fornecidos para fazer comparações realistas
- Cite números específicos do representante
- **USE OS BENCHMARKS DO SETOR** fornecidos nos dados de mercado para comparações precisas
- **COMPARE PREÇOS** das propostas com os preços de mercado fornecidos
- **ANALISE PRODUTOS** mais vendidos/pedidos para identificar oportunidades competitivas
- Seja prático e acionável

Forneça uma análise comparativa incluindo:
1. POSICIONAMENTO ATUAL (onde o representante está em relação ao mercado, usando benchmarks fornecidos)
2. COMPARAÇÃO COM BENCHMARKS (use os números reais vs. benchmarks do setor fornecidos nos dados)
3. ANÁLISE DE PREÇOS (compare preços das propostas com preços de mercado, identifique se está competitivo)
4. PRODUTOS EM ALTA DEMANDA (identifique quais produtos do portfólio estão alinhados com tendências de mercado)
5. VANTAGENS COMPETITIVAS (o que está funcionando bem baseado nos dados e comparações)
6. GAPS COMPETITIVOS (onde precisa melhorar, baseado em benchmarks e dados de mercado)
7. ESTRATÉGIAS DE DIFERENCIAÇÃO (ações específicas para se destacar, considerando dados de mercado)

IMPORTANTE: 
- Use os benchmarks e dados de mercado fornecidos para fazer comparações precisas
- Seja específico: cite valores, percentuais, produtos mencionados nos dados de mercado
- Não invente benchmarks, use apenas os fornecidos`,

  tendencia: `Você é um analista de tendências especializado em representação comercial B2B para supermercados.

CONTEXTO: Analise os dados históricos reais fornecidos para identificar padrões, tendências e projeções baseadas no comportamento atual do representante e dados de mercado.

DADOS DO SISTEMA:
{dados}

INSTRUÇÕES:
- Identifique padrões REAIS nos dados fornecidos (ex: quais clientes compram mais, quando há mais visitas, etc.)
- **USE DADOS DE MERCADO** (produtos mais vendidos/pedidos, sazonalidade) para identificar tendências de mercado
- **CROSS-REFERENCE** padrões internos com tendências de mercado fornecidas
- Projete tendências baseadas no histórico REAL e dados de mercado, não em suposições genéricas
- Foque em padrões de comportamento do representante e seus clientes
- Seja específico sobre o que os dados mostram

Forneça uma análise de tendências incluindo:
1. PADRÕES IDENTIFICADOS (o que os dados mostram sobre comportamento, sazonalidade, etc.)
2. TENDÊNCIAS DE MERCADO (produtos/categorias em alta demanda baseado nos dados de mercado)
3. ALINHAMENTO COM MERCADO (quais produtos do portfólio estão alinhados com tendências de mercado)
4. TENDÊNCIAS EMERGENTES (baseadas no histórico real do representante e dados de mercado)
5. PROJEÇÕES (o que pode acontecer nos próximos meses baseado nos dados atuais e tendências de mercado)
6. OPORTUNIDADES DE CRESCIMENTO (identificadas a partir dos padrões reais e dados de mercado)
7. AÇÕES RECOMENDADAS (como capitalizar nas tendências identificadas, considerando dados de mercado)

IMPORTANTE: 
- Use dados de mercado (sazonalidade, produtos mais pedidos) para enriquecer a análise
- Seja específico: cite produtos, períodos, regiões mencionados nos dados de mercado
- Não faça análises genéricas, use os dados fornecidos`,

  oportunidade: `Você é um consultor estratégico especializado em identificar oportunidades de negócio B2B para representantes comerciais.
 
CONTEXTO: Analise os dados reais do representante e dados de mercado para responder DIRETAMENTE à pergunta ou questão específica fornecida pelo usuário.
 
PERGUNTA/QUESTÃO DO USUÁRIO:
{pergunta}
 
DADOS DO SISTEMA (para contextualizar sua resposta):
{dados}
 
INSTRUÇÕES CRÍTICAS:
- **RESPONDA DIRETAMENTE À PERGUNTA DO USUÁRIO** acima. Esta é a prioridade máxima.
- **SE A PERGUNTA MENCIONAR PRODUTO/REGIÃO ESPECÍFICA**: Procure nos dados de mercado por preços, produtos concorrentes e rankings para aquela região/produto específico
- **SE A PERGUNTA FOR SOBRE COMPARAÇÃO/CONCORRENTES**: Você DEVE usar os dados de mercado fornecidos. Procure na seção "PRODUTOS CONCORRENTES" e "PREÇOS DE MERCADO" para fazer comparações reais
- Use os dados do sistema E dados de mercado para fundamentar e contextualizar sua resposta
- **USE DADOS DE MERCADO** (preços, produtos mais vendidos/pedidos, benchmarks, produtos concorrentes) para enriquecer sua resposta
- Se a pergunta for sobre produtos, analise os produtos nos dados E compare com produtos mais vendidos/pedidos no mercado
- Se a pergunta for sobre preços, **COMPARE COM PREÇOS DE MERCADO FORNECIDOS** - cite valores específicos dos dados de mercado
- Se a pergunta for sobre concorrentes, **USE A SEÇÃO "PRODUTOS CONCORRENTES"** dos dados de mercado para fazer comparações reais
- Se a pergunta for sobre rentabilidade/lucro, calcule margens, compare valores de compra vs. venda, analise produtos mais rentáveis E compare com benchmarks
- Se a pergunta for sobre oportunidades, identifique produtos em alta demanda nos dados de mercado
- Seja específico: cite nomes de produtos, marcas, clientes, valores exatos dos dados E dados de mercado
- **SE NÃO HOUVER DADOS DE MERCADO DISPONÍVEIS**: Informe claramente que não há dados de mercado cadastrados e que seria necessário cadastrar preços de concorrentes, produtos mais vendidos, etc.
- Priorize informações que respondam diretamente à pergunta
- Se não houver dados suficientes para responder completamente, mencione isso e use o que estiver disponível
 
ESTRUTURA DA RESPOSTA:
1. RESPOSTA DIRETA (responda a pergunta do usuário de forma clara e direta, usando dados específicos e dados de mercado)
2. COMPARAÇÃO COM MERCADO (SE a pergunta for sobre comparação/concorrentes, esta seção é OBRIGATÓRIA - use os dados de mercado fornecidos para fazer comparações reais com preços, produtos concorrentes, rankings)
3. ANÁLISE DETALHADA (explique sua resposta com base nos dados fornecidos e dados de mercado)
4. DADOS DE APOIO (cite números, produtos, clientes específicos dos dados E dados de mercado que fundamentam sua resposta)
5. RECOMENDAÇÕES (se aplicável, baseadas na resposta à pergunta e dados de mercado)
 
IMPORTANTE: 
- A pergunta do usuário é o foco principal. Use dados internos E dados de mercado para fundamentar a resposta.
- **SE A PERGUNTA FOR SOBRE COMPARAÇÃO/CONCORRENTES**: Você DEVE procurar e usar os dados de mercado fornecidos. Não invente comparações genéricas.
- Se a pergunta for "Quais produtos têm mais chances de dar lucro?", analise produtos nos dados, compare com produtos mais vendidos/pedidos, compare preços com mercado, analise margens
- Seja específico e cite dados reais dos dados internos E dados de mercado. Não faça análises genéricas.
- **SE NÃO HOUVER DADOS DE MERCADO**: Informe claramente que não há dados cadastrados e sugira cadastrar preços de concorrentes, produtos mais vendidos, etc.`,
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
    dados: string,
    perguntaUsuario?: string
  ): Promise<string> {
    const openai = getOpenAI();
    if (!openai) {
      throw new Error('OpenAI API não configurada. Configure OPENAI_API_KEY no arquivo .env');
    }

    let prompt = PROMPTS[tipo];
    
    // Se for tipo "oportunidade" e houver pergunta do usuário, usar formato especial
    if (tipo === 'oportunidade' && perguntaUsuario) {
      // Separar pergunta dos dados se necessário
      prompt = prompt
        .replace('{pergunta}', perguntaUsuario.trim())
        .replace('{dados}', dados);
    } else {
      // Para outros tipos, usar formato padrão
      prompt = prompt.replace('{dados}', dados);
    }

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

  async gerarAnaliseSaida(prompt: string): Promise<any> {
    const openai = getOpenAI();
    if (!openai) {
      throw new Error('OpenAI API não configurada. Configure OPENAI_API_KEY no arquivo .env');
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de vendas no varejo. Sempre retorne apenas JSON válido, sem markdown ou texto adicional.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
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
      return parsed;
    } catch (error: any) {
      console.error('Erro ao gerar análise de saída com OpenAI:', error);
      throw new Error(`Erro ao gerar análise de saída: ${error.message || 'Erro desconhecido'}`);
    }
  }

  /**
   * Interpreta um prompt em linguagem natural e retorna dados estruturados
   * para criar tabela de produtos e opcionalmente enviar (fluxo "Criar proposta com IA").
   */
  async propostaPorPrompt(promptUsuario: string): Promise<{
    cliente: string;
    clienteId?: string;
    quantidadeProdutos?: number;
    produtosSugeridos?: Array<{
      produto: string;
      marca?: string;
      quantidade?: number;
      valorUnitario?: number;
      unidadeMedida?: string;
    }>;
    acao?: 'criar' | 'criar_e_enviar';
    nomeTabela?: string;
  }> {
    const openai = getOpenAI();
    if (!openai) {
      throw new Error('OpenAI API não configurada. Configure OPENAI_API_KEY no arquivo .env');
    }

    const systemPrompt = `Você é um assistente que interpreta pedidos em linguagem natural para criar propostas comerciais B2B (tabelas de produtos).

Sua tarefa é analisar o prompt do usuário e extrair as informações em um JSON com EXATAMENTE esta estrutura. Responda APENAS com um JSON válido, sem texto antes ou depois.

REGRAS:
1. **cliente** (OBRIGATÓRIO): Extraia sempre o nome do cliente. Procure por:
   - Nome entre aspas (ex: "João Silva")
   - Nome após palavras como "cliente", "para o cliente", "para"
   - Se não encontrar nome explícito, use um nome genérico como "Cliente" ou o primeiro nome que parecer referir-se ao destinatário

2. **quantidadeProdutos** (opcional): Se o usuário disser "com N produtos", "N produtos", "N itens", preencha com o número N.

3. **produtosSugeridos** (opcional): Array de objetos com: produto (string), marca (string opcional), quantidade (number opcional), valorUnitario (number opcional), unidadeMedida (string opcional, ex: "unidade", "kg", "caixa"). Se o usuário pediu "N produtos" sem especificar quais, sugira placeholders como "Produto 1", "Produto 2", "Produto 3" com marca e valores sugeridos.

4. **acao** (opcional): 
   - Se o usuário pedir "envio", "enviar", "faça o envio", "envie", "enviar a proposta", retorne "criar_e_enviar"
   - Caso contrário retorne "criar"

5. **nomeTabela** (opcional): Sugestão de nome para a tabela. Ex: "Proposta João Silva - Jan 2025" (use mês/ano atual).

NÃO inclua clienteId na resposta (o backend preencherá se encontrar no cadastro).

Exemplo de resposta:
{"cliente":"João Silva","quantidadeProdutos":3,"produtosSugeridos":[{"produto":"Produto 1","marca":"Marca X","quantidade":1,"valorUnitario":100,"unidadeMedida":"unidade"},{"produto":"Produto 2","marca":"Marca Y","quantidade":1,"valorUnitario":150,"unidadeMedida":"unidade"},{"produto":"Produto 3","marca":"Marca Z","quantidade":1,"valorUnitario":80,"unidadeMedida":"unidade"}],"acao":"criar_e_enviar","nomeTabela":"Proposta João Silva - Fev 2025"}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: promptUsuario.trim() },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content || '{}';
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonContent = jsonMatch[0];

      const parsed = JSON.parse(jsonContent);

      if (!parsed.cliente || typeof parsed.cliente !== 'string') {
        parsed.cliente = 'Cliente';
      }
      if (parsed.acao && !['criar', 'criar_e_enviar'].includes(parsed.acao)) {
        parsed.acao = 'criar';
      }

      return {
        cliente: String(parsed.cliente).trim(),
        quantidadeProdutos: typeof parsed.quantidadeProdutos === 'number' ? parsed.quantidadeProdutos : undefined,
        produtosSugeridos: Array.isArray(parsed.produtosSugeridos) ? parsed.produtosSugeridos : undefined,
        acao: parsed.acao === 'criar_e_enviar' ? 'criar_e_enviar' : 'criar',
        nomeTabela: typeof parsed.nomeTabela === 'string' ? parsed.nomeTabela.trim() : undefined,
      };
    } catch (error: any) {
      console.error('Erro ao interpretar proposta por prompt:', error);
      if (error instanceof SyntaxError || error.message?.includes('JSON')) {
        throw new Error('Erro ao processar resposta da IA: formato JSON inválido');
      }
      throw new Error(`Erro ao interpretar prompt: ${error.message || 'Erro desconhecido'}`);
    }
  }
}

