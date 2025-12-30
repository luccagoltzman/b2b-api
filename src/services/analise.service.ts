import { OpenAIService } from './openai.service';
import { prisma } from '../lib/prisma';
import { PropostaService } from './proposta.service';
import { VisitaService } from './visita.service';
import { DashboardService } from './dashboard.service';
import { MercadoService } from './mercado.service';

export class AnaliseService {
  private openaiService: OpenAIService;
  private propostaService: PropostaService;
  private visitaService: VisitaService;
  private dashboardService: DashboardService;
  private mercadoService: MercadoService;

  constructor() {
    this.openaiService = OpenAIService.getInstance();
    this.propostaService = new PropostaService();
    this.visitaService = new VisitaService();
    this.dashboardService = new DashboardService();
    this.mercadoService = new MercadoService();
  }

  private async coletarDadosReais(): Promise<string> {
    // Coletar propostas com TODOS os detalhes (incluindo checkpoints)
    const propostas = await prisma.proposta.findMany({
      include: {
        checkpoints: {
          orderBy: { data: 'desc' },
        },
      },
      orderBy: { dataCriacao: 'desc' },
    });

    // Coletar visitas com TODOS os detalhes (incluindo checkpoints)
    const visitas = await prisma.visita.findMany({
      include: {
        checkpoints: {
          orderBy: { data: 'desc' },
        },
      },
      orderBy: { data: 'desc' },
    });

    // Calcular estatísticas corretas
    const totalPropostas = propostas.length;
    const propostasAprovadas = propostas.filter((p: any) => p.status === 'aprovada').length;
    const propostasRejeitadas = propostas.filter((p: any) => p.status === 'rejeitada').length;
    const propostasPendentes = propostas.filter((p: any) => 
      ['rascunho', 'pendente', 'enviada', 'em_analise_gerente_compras', 'em_analise_diretoria'].includes(p.status)
    ).length;
    
    // Taxa de conversão CORRETA: (aprovadas / total) * 100
    const taxaConversao = totalPropostas > 0 
      ? (propostasAprovadas / totalPropostas) * 100 
      : 0;

    const propostasPorStatus = propostas.reduce((acc: Record<string, number>, p: any) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const valorTotalPropostas = propostas.reduce((sum: number, p: any) => sum + p.valor, 0);
    const valorMedioProposta = totalPropostas > 0 ? valorTotalPropostas / totalPropostas : 0;
    const valorTotalAprovadas = propostas
      .filter((p: any) => p.status === 'aprovada')
      .reduce((sum: number, p: any) => sum + p.valor, 0);

    // Receita mensal (propostas aprovadas no mês atual)
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const receitaMensal = propostas
      .filter((p: any) => p.status === 'aprovada' && new Date(p.dataCriacao) >= inicioMes)
      .reduce((sum: number, p: any) => sum + p.valor, 0);

    const visitasPorStatus = visitas.reduce((acc: Record<string, number>, v: any) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const visitasRealizadas = visitas.filter((v: any) => v.status === 'realizada').length;
    const totalVisitas = visitas.length;

    // Coletar clientes únicos
    const clientesPropostas = new Set(propostas.map((p: any) => p.cliente));
    const clientesVisitas = new Set(visitas.map((v: any) => v.cliente));
    const totalClientes = new Set([...clientesPropostas, ...clientesVisitas]).size;

    // Propostas recentes (últimos 30 dias)
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    const propostasRecentes = propostas.filter((p: any) => 
      new Date(p.dataCriacao) >= trintaDiasAtras
    );

    // Visitas recentes
    const visitasRecentes = visitas.filter((v: any) => 
      new Date(v.data) >= trintaDiasAtras
    );

    // Propostas próximas do vencimento
    const hoje = new Date();
    const seteDiasFrente = new Date();
    seteDiasFrente.setDate(seteDiasFrente.getDate() + 7);
    const propostasVencendo = propostas.filter((p: any) => {
      const vencimento = new Date(p.dataVencimento);
      return vencimento >= hoje && vencimento <= seteDiasFrente && 
        ['rascunho', 'pendente', 'enviada', 'em_analise_gerente_compras', 'em_analise_diretoria'].includes(p.status);
    });

    // Top clientes por valor
    const clientesPorValor = propostas.reduce((acc: Record<string, number>, p: any) => {
      if (!acc[p.cliente]) acc[p.cliente] = 0;
      acc[p.cliente] += p.valor;
      return acc;
    }, {} as Record<string, number>);
    const topClientes = Object.entries(clientesPorValor)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([cliente, valor]) => ({ cliente, valor: valor as number }));

    // Análise de produtos e rentabilidade
    const produtosPorMarca = propostas.reduce((acc: Record<string, any[]>, p: any) => {
      if (p.produto && p.marca) {
        const chave = `${p.produto} - ${p.marca}`;
        if (!acc[chave]) acc[chave] = [];
        acc[chave].push(p);
      }
      return acc;
    }, {} as Record<string, any[]>);

    const produtosAnalise = Object.entries(produtosPorMarca).map(([produtoMarca, propostasProduto]) => {
      const propostasArray = propostasProduto as any[];
      const totalPropostas = propostasArray.length;
      const aprovadas = propostasArray.filter((p: any) => p.status === 'aprovada').length;
      const valorTotal = propostasArray.reduce((sum: number, p: any) => sum + (p.valor || 0), 0);
      const valorTotalAprovado = propostasArray
        .filter((p: any) => p.status === 'aprovada')
        .reduce((sum: number, p: any) => sum + (p.valorCompra || p.valor || 0), 0);
      const quantidadeTotal = propostasArray.reduce((sum: number, p: any) => sum + (p.quantidade || 0), 0);
      const quantidadeAdquiridaTotal = propostasArray
        .filter((p: any) => p.status === 'aprovada')
        .reduce((sum: number, p: any) => sum + (p.quantidadeAdquirida || 0), 0);
      const valorMedio = totalPropostas > 0 ? valorTotal / totalPropostas : 0;
      const taxaAprovacao = totalPropostas > 0 ? (aprovadas / totalPropostas) * 100 : 0;
      
      // Calcular margem de lucro (se houver dados de compra)
      const propostasComDadosCompra = propostasArray.filter((p: any) => 
        p.status === 'aprovada' && p.valorCompra && p.valor
      );
      const margemLucro = propostasComDadosCompra.length > 0
        ? propostasComDadosCompra.reduce((sum: number, p: any) => {
            const margem = ((p.valor - p.valorCompra) / p.valorCompra) * 100;
            return sum + margem;
          }, 0) / propostasComDadosCompra.length
        : 0;

      return {
        produtoMarca,
        totalPropostas,
        aprovadas,
        valorTotal,
        valorTotalAprovado,
        quantidadeTotal,
        quantidadeAdquiridaTotal,
        valorMedio,
        taxaAprovacao,
        margemLucro,
        categoria: propostasArray[0]?.categoria || 'N/A',
      };
    });

    // Formatar TODAS as propostas com detalhes completos
    const propostasDetalhadas = propostas.map((p: any) => {
      const checkpointsInfo = (p.checkpoints || []).map((cp: any) => 
        `    - ${cp.label} (${new Date(cp.data).toLocaleDateString('pt-BR')}): ${cp.descricao || 'Sem descrição'}`
      ).join('\n');
      
      return `
  Proposta ID: ${p.id}
  Cliente: ${p.cliente}
  Produto: ${p.produto || 'N/A'}
  Marca: ${p.marca || 'N/A'}
  Categoria: ${p.categoria || 'N/A'}
  Valor: R$ ${p.valor.toFixed(2)}
  Valor de Compra: ${p.valorCompra ? `R$ ${p.valorCompra.toFixed(2)}` : 'N/A'}
  Quantidade: ${p.quantidade || 'N/A'}
  Quantidade Adquirida: ${p.quantidadeAdquirida || 'N/A'}
  Status Atual: ${p.status}
  Data de Criação: ${new Date(p.dataCriacao).toLocaleDateString('pt-BR')}
  Data de Vencimento: ${new Date(p.dataVencimento).toLocaleDateString('pt-BR')}
  Descrição: ${p.descricao || 'Sem descrição'}
  Observações: ${p.observacoes || 'Sem observações'}
  Histórico de Status (Checkpoints):
${checkpointsInfo || '    - Nenhum checkpoint registrado'}
`;
    }).join('\n');

    // Formatar TODAS as visitas com detalhes completos
    const visitasDetalhadas = visitas.map((v: any) => {
      const checkpointsInfo = (v.checkpoints || []).map((cp: any) => 
        `    - ${cp.label} (${new Date(cp.data).toLocaleDateString('pt-BR')}): ${cp.descricao || 'Sem descrição'}`
      ).join('\n');
      
      return `
  Visita ID: ${v.id}
  Cliente: ${v.cliente}
  Data: ${new Date(v.data).toLocaleDateString('pt-BR')}
  Hora: ${v.hora}
  Status Atual: ${v.status}
  Endereço: ${v.endereco || 'Não informado'}
  Observações: ${v.observacoes || 'Sem observações'}
  Histórico de Status (Checkpoints):
${checkpointsInfo || '    - Nenhum checkpoint registrado'}
`;
    }).join('\n');

    // Formatar dados para a IA
    const dadosFormatados = `
=== ESTATÍSTICAS GERAIS ===
- Total de propostas: ${totalPropostas}
- Total de visitas: ${totalVisitas}
- Taxa de conversão (aprovadas/total): ${taxaConversao.toFixed(2)}%
- Propostas aprovadas: ${propostasAprovadas}
- Propostas rejeitadas: ${propostasRejeitadas}
- Propostas pendentes/em análise: ${propostasPendentes}
- Receita mensal (aprovadas no mês): R$ ${receitaMensal.toFixed(2)}
- Valor total em propostas aprovadas: R$ ${valorTotalAprovadas.toFixed(2)}

=== PROPOSTAS POR STATUS ===
${Object.entries(propostasPorStatus).map(([status, count]) => 
  `- ${status}: ${count}`
).join('\n')}

=== VISITAS POR STATUS ===
${Object.entries(visitasPorStatus).map(([status, count]) => 
  `- ${status}: ${count}`
).join('\n')}

=== VALORES E MÉTRICAS ===
- Valor total em propostas: R$ ${valorTotalPropostas.toFixed(2)}
- Valor médio por proposta: R$ ${valorMedioProposta.toFixed(2)}
- Valor total aprovado: R$ ${valorTotalAprovadas.toFixed(2)}
- Propostas criadas nos últimos 30 dias: ${propostasRecentes.length}
- Visitas realizadas nos últimos 30 dias: ${visitasRecentes.length}
- Propostas vencendo nos próximos 7 dias: ${propostasVencendo.length}

=== CLIENTES ===
- Total de clientes únicos: ${totalClientes}
- Top 5 clientes por valor:
${topClientes.map((c, i) => `  ${i + 1}. ${c.cliente}: R$ ${c.valor.toFixed(2)}`).join('\n')}

=== ANÁLISE DE PRODUTOS E RENTABILIDADE ===
${produtosAnalise.length > 0 ? produtosAnalise.map((prod, i) => `
${i + 1}. ${prod.produtoMarca}
   - Categoria: ${prod.categoria}
   - Total de propostas: ${prod.totalPropostas}
   - Propostas aprovadas: ${prod.aprovadas} (Taxa: ${prod.taxaAprovacao.toFixed(2)}%)
   - Valor total em propostas: R$ ${prod.valorTotal.toFixed(2)}
   - Valor total aprovado/comprado: R$ ${prod.valorTotalAprovado.toFixed(2)}
   - Quantidade total proposta: ${prod.quantidadeTotal}
   - Quantidade adquirida: ${prod.quantidadeAdquiridaTotal}
   - Valor médio por proposta: R$ ${prod.valorMedio.toFixed(2)}
   - Margem de lucro média: ${prod.margemLucro > 0 ? `${prod.margemLucro.toFixed(2)}%` : 'N/A (sem dados de compra)'}
`).join('\n') : 'Nenhum produto com informações completas disponível'}

=== DETALHES COMPLETOS DE TODAS AS PROPOSTAS ===
${propostasDetalhadas}

=== DETALHES COMPLETOS DE TODAS AS VISITAS ===
${visitasDetalhadas}

=== PROPOSTAS VENCENDO EM BREVE ===
${propostasVencendo.map((p: any) => 
  `- ${p.cliente}: R$ ${p.valor.toFixed(2)} (Status: ${p.status}, Vence em: ${new Date(p.dataVencimento).toLocaleDateString('pt-BR')})`
).join('\n') || 'Nenhuma proposta vencendo em breve'}
`;

    return dadosFormatados;
  }

  /**
   * Extrai informações de produto, marca e região da pergunta do usuário
   */
  private extrairInfoDaPergunta(pergunta: string): {
    produto?: string;
    marca?: string;
    regiao?: string;
    categoria?: string;
  } {
    const perguntaLower = pergunta.toLowerCase();
    const info: { produto?: string; marca?: string; regiao?: string; categoria?: string } = {};

    const siglasEstados: Record<string, string> = {
      'ac': 'acre', 'al': 'alagoas', 'ap': 'amapá', 'am': 'amazonas', 'ba': 'bahia',
      'ce': 'ceará', 'df': 'distrito federal', 'es': 'espírito santo', 'go': 'goiás',
      'ma': 'maranhão', 'mt': 'mato grosso', 'ms': 'mato grosso do sul', 'mg': 'minas gerais',
      'pa': 'pará', 'pb': 'paraíba', 'pr': 'paraná', 'pe': 'pernambuco', 'pi': 'piauí',
      'rj': 'rio de janeiro', 'rn': 'rio grande do norte', 'rs': 'rio grande do sul',
      'ro': 'rondônia', 'rr': 'roraima', 'sc': 'santa catarina', 'sp': 'são paulo',
      'se': 'sergipe', 'to': 'tocantins'
    };

    // Buscar por cidade + estado (ex: "São Luís - MA", "São Luís-MA")
    const cidadeEstadoMatch = perguntaLower.match(/([a-záàâãéêíóôõúç\s]+)\s*[-–]\s*([a-z]{2})\b/i);
    if (cidadeEstadoMatch) {
      const estadoSigla = cidadeEstadoMatch[2].toUpperCase();
      if (siglasEstados[estadoSigla.toLowerCase()]) {
        info.regiao = estadoSigla;
      }
    }

    // Buscar por estado mencionado (ex: "em MA", "-MA", "Maranhão")
    if (!info.regiao) {
      for (const [sigla, estado] of Object.entries(siglasEstados)) {
        if (perguntaLower.includes(` ${sigla.toLowerCase()} `) || 
            perguntaLower.includes(`-${sigla.toLowerCase()}`) ||
            perguntaLower.includes(` ${sigla.toLowerCase()}.`) ||
            perguntaLower.includes(estado)) {
          info.regiao = sigla.toUpperCase();
          break;
        }
      }
    }

    // Extrair marca (palavras comuns em marcas - case insensitive)
    const marcasComuns = ['quick', 'nestlé', 'nestle', 'kibon', 'eletrolux', 'brastemp', 'consul', 'lg', 'samsung', 'brastemp'];
    for (const marca of marcasComuns) {
      if (perguntaLower.includes(marca)) {
        info.marca = marca;
        break;
      }
    }

    // Extrair produto mencionado (buscar palavras-chave de produtos)
    const produtosComuns = [
      { palavra: 'gelato', produto: 'gelato' },
      { palavra: 'gelados', produto: 'gelado' },
      { palavra: 'sorvete', produto: 'sorvete' },
      { palavra: 'refrigerador', produto: 'refrigerador' },
      { palavra: 'geladeira', produto: 'geladeira' },
      { palavra: 'fogão', produto: 'fogão' },
      { palavra: 'máquina', produto: 'máquina' },
      { palavra: 'freezer', produto: 'freezer' },
    ];
    
    for (const { palavra, produto } of produtosComuns) {
      if (perguntaLower.includes(palavra)) {
        info.produto = produto;
        // Inferir categoria baseada no produto
        if (['gelato', 'gelado', 'sorvete'].includes(produto)) {
          info.categoria = 'Alimentos';
        } else if (['refrigerador', 'geladeira', 'fogão', 'freezer', 'máquina'].includes(produto)) {
          info.categoria = 'Eletrodomésticos';
        }
        break;
      }
    }

    return info;
  }

  async gerarAnalise(
    tipo: 'performance' | 'concorrencia' | 'tendencia' | 'oportunidade',
    dadosAdicionais?: string
  ): Promise<string> {
    // Coletar dados reais do banco
    const dadosReais = await this.coletarDadosReais();
    
    // Extrair produtos e regiões das propostas para buscar dados de mercado
    const propostas = await prisma.proposta.findMany({
      where: {
        produto: { not: null },
      },
      select: {
        produto: true,
        marca: true,
        categoria: true,
        clienteEstado: true,
      },
      take: 50,
    });

    // Extrair produtos únicos e regiões
    const produtosUnicos = Array.from(
      new Set(
        propostas
          .filter((p) => p.produto)
          .map((p) => JSON.stringify({ produto: p.produto, marca: p.marca, categoria: p.categoria }))
      )
    ).map((str) => JSON.parse(str));

    const regioes = Array.from(
      new Set(propostas.filter((p) => p.clienteEstado).map((p) => p.clienteEstado))
    ).filter(Boolean) as string[];

    // Extrair pergunta do usuário se fornecida
    let perguntaUsuario: string | undefined;
    let infoDaPergunta: { produto?: string; marca?: string; regiao?: string; categoria?: string } = {};
    let dadosCompletos = dadosReais; // Declarar antes de usar
    
    if (dadosAdicionais) {
      const perguntaLimpa = dadosAdicionais.trim();
      
      // Detectar se é uma pergunta:
      const palavrasInterrogativas = ['quais', 'qual', 'como', 'quando', 'onde', 'por que', 'porque', 'quem', 'o que', 'que', 'dados', 'comparativos', 'comparação'];
      const temInterrogacao = perguntaLimpa.includes('?');
      const temPalavraInterrogativa = palavrasInterrogativas.some(palavra => 
        perguntaLimpa.toLowerCase().startsWith(palavra) || 
        perguntaLimpa.toLowerCase().includes(` ${palavra} `)
      );
      const eFraseCurta = perguntaLimpa.length < 500;
      
      // Se parecer uma pergunta, tratar como pergunta do usuário
      if (temInterrogacao || (temPalavraInterrogativa && eFraseCurta)) {
        perguntaUsuario = perguntaLimpa;
        // Extrair informações da pergunta para buscar dados de mercado específicos
        infoDaPergunta = this.extrairInfoDaPergunta(perguntaLimpa);
      } else {
        // Se for texto longo ou não parecer pergunta, tratar como dados adicionais
        dadosCompletos = `${dadosReais}\n\n=== INFORMAÇÕES ADICIONAIS FORNECIDAS ===\n${dadosAdicionais}`;
      }
    }

    // Se a pergunta menciona produto/região específica, buscar dados de mercado focados
    let dadosMercado = '';
    if (infoDaPergunta.produto || infoDaPergunta.marca || infoDaPergunta.regiao) {
      // Se mencionou produto/marca, buscar nas propostas para encontrar categoria real
      if ((infoDaPergunta.produto || infoDaPergunta.marca) && !infoDaPergunta.categoria) {
        const propostaRelevante = propostas.find(p => 
          (infoDaPergunta.produto && p.produto?.toLowerCase().includes(infoDaPergunta.produto.toLowerCase())) ||
          (infoDaPergunta.marca && p.marca?.toLowerCase().includes(infoDaPergunta.marca.toLowerCase()))
        );
        if (propostaRelevante?.categoria) {
          infoDaPergunta.categoria = propostaRelevante.categoria;
        }
      }

      // Buscar dados de mercado específicos para o produto/marca/região mencionados
      const produtosParaBuscar = infoDaPergunta.produto || infoDaPergunta.marca 
        ? [{ produto: infoDaPergunta.produto, marca: infoDaPergunta.marca, categoria: infoDaPergunta.categoria }]
        : produtosUnicos;
      
      const regiaoParaBuscar = infoDaPergunta.regiao || (regioes.length > 0 ? regioes[0] : undefined);
      
      dadosMercado = await this.mercadoService.formatarDadosMercadoParaIA(
        produtosParaBuscar,
        regiaoParaBuscar
      );

      // Se mencionou produto específico, buscar também concorrentes na mesma categoria/região
      if (infoDaPergunta.produto || infoDaPergunta.marca) {
        const dadosConcorrentes = await this.mercadoService.buscarDadosConcorrentes(
          infoDaPergunta.produto,
          infoDaPergunta.marca,
          infoDaPergunta.categoria,
          regiaoParaBuscar
        );
        if (dadosConcorrentes) {
          dadosMercado = dadosMercado ? `${dadosMercado}\n\n${dadosConcorrentes}` : dadosConcorrentes;
        }
      }
    } else {
      // Buscar dados de mercado gerais
      dadosMercado = await this.mercadoService.formatarDadosMercadoParaIA(
        produtosUnicos,
        regioes.length > 0 ? regioes[0] : undefined
      );
    }

    // Combinar dados reais com dados de mercado
    if (dadosMercado) {
      dadosCompletos = `${dadosCompletos}\n\n${dadosMercado}`;
    }
    
    const resultado = await this.openaiService.gerarAnalise(tipo, dadosCompletos, perguntaUsuario);

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

  async obterInsightsProdutos() {
    const propostas = await prisma.proposta.findMany({
      include: {
        checkpoints: {
          orderBy: { data: 'desc' },
        },
      },
      orderBy: { dataCriacao: 'desc' },
    });

    // Análise de produtos e rentabilidade
    // Agrupar por produto e marca (ou apenas produto se não houver marca)
    const produtosPorMarca = propostas.reduce((acc: Record<string, any[]>, p: any) => {
      if (p.produto) {
        // Criar chave com produto e marca (ou apenas produto)
        const chave = p.marca ? `${p.produto} - ${p.marca}` : `${p.produto}`;
        if (!acc[chave]) acc[chave] = [];
        acc[chave].push(p);
      }
      return acc;
    }, {} as Record<string, any[]>);

    const produtosAnalise = Object.entries(produtosPorMarca).map(([produtoMarca, propostasProduto]) => {
      const propostasArray = propostasProduto as any[];
      const totalPropostas = propostasArray.length;
      const aprovadas = propostasArray.filter((p: any) => p.status === 'aprovada').length;
      const valorTotal = propostasArray.reduce((sum: number, p: any) => sum + (p.valor || 0), 0);
      const valorTotalAprovado = propostasArray
        .filter((p: any) => p.status === 'aprovada')
        .reduce((sum: number, p: any) => sum + (p.valorCompra || p.valor || 0), 0);
      const quantidadeTotal = propostasArray.reduce((sum: number, p: any) => sum + (p.quantidade || 0), 0);
      const quantidadeAdquiridaTotal = propostasArray
        .filter((p: any) => p.status === 'aprovada')
        .reduce((sum: number, p: any) => sum + (p.quantidadeAdquirida || 0), 0);
      const valorMedio = totalPropostas > 0 ? valorTotal / totalPropostas : 0;
      const taxaAprovacao = totalPropostas > 0 ? (aprovadas / totalPropostas) * 100 : 0;
      
      // Calcular margem de lucro (se houver dados de compra)
      const propostasComDadosCompra = propostasArray.filter((p: any) => 
        p.status === 'aprovada' && p.valorCompra && p.valor
      );
      const margemLucro = propostasComDadosCompra.length > 0
        ? propostasComDadosCompra.reduce((sum: number, p: any) => {
            const margem = ((p.valor - p.valorCompra) / p.valorCompra) * 100;
            return sum + margem;
          }, 0) / propostasComDadosCompra.length
        : 0;

      // Separar produto e marca
      const partes = produtoMarca.split(' - ');
      const produto = partes[0];
      const marca = partes.length > 1 ? partes[1] : undefined;

      return {
        produto,
        marca: marca || null,
        categoria: propostasArray[0]?.categoria || 'N/A',
        totalPropostas,
        aprovadas,
        rejeitadas: propostasArray.filter((p: any) => p.status === 'rejeitada').length,
        valorTotal,
        valorTotalAprovado,
        quantidadeTotal,
        quantidadeAdquiridaTotal,
        valorMedio,
        taxaAprovacao,
        margemLucro: margemLucro > 0 ? margemLucro : null,
      };
    });

    // Ordenar por valor total aprovado (maior primeiro)
    produtosAnalise.sort((a, b) => b.valorTotalAprovado - a.valorTotalAprovado);

    return produtosAnalise;
  }

  /**
   * Analisa um produto específico com dados de mercado e benchmarks
   */
  async analisarProduto(
    produto: string,
    marca?: string,
    categoria?: string,
    regiao?: string,
    pergunta?: string
  ): Promise<string> {
    // Buscar propostas relacionadas ao produto
    const where: any = {
      produto: { contains: produto },
    };

    if (marca) {
      where.marca = { contains: marca };
    }

    if (categoria) {
      where.categoria = categoria;
    }

    const propostasProduto = await prisma.proposta.findMany({
      where,
      include: {
        checkpoints: {
          orderBy: { data: 'desc' },
        },
      },
      orderBy: { dataCriacao: 'desc' },
    });

    // Coletar dados específicos do produto
    const totalPropostas = propostasProduto.length;
    const aprovadas = propostasProduto.filter((p: any) => p.status === 'aprovada').length;
    const rejeitadas = propostasProduto.filter((p: any) => p.status === 'rejeitada').length;
    const valorTotal = propostasProduto.reduce((sum: number, p: any) => sum + (p.valor || 0), 0);
    const valorTotalAprovado = propostasProduto
      .filter((p: any) => p.status === 'aprovada')
      .reduce((sum: number, p: any) => sum + (p.valor || 0), 0);
    const valorMedio = totalPropostas > 0 ? valorTotal / totalPropostas : 0;
    const taxaAprovacao = totalPropostas > 0 ? (aprovadas / totalPropostas) * 100 : 0;

    // Formatar dados do produto
    const dadosProduto = `
=== DADOS DO PRODUTO: ${produto}${marca ? ` (${marca})` : ''} ===

INFORMAÇÕES GERAIS:
- Total de propostas: ${totalPropostas}
- Propostas aprovadas: ${aprovadas}
- Propostas rejeitadas: ${rejeitadas}
- Taxa de aprovação: ${taxaAprovacao.toFixed(2)}%
- Valor total em propostas: R$ ${valorTotal.toFixed(2)}
- Valor total aprovado: R$ ${valorTotalAprovado.toFixed(2)}
- Valor médio por proposta: R$ ${valorMedio.toFixed(2)}

DETALHES DAS PROPOSTAS:
${propostasProduto.map((p: any, index: number) => `
${index + 1}. Cliente: ${p.cliente}
   - Valor: R$ ${p.valor.toFixed(2)}
   - Status: ${p.status}
   - Data: ${new Date(p.dataCriacao).toLocaleDateString('pt-BR')}
   - Quantidade: ${p.quantidade || 'N/A'}
   - Valor Unitário: ${p.valorUnitario ? `R$ ${p.valorUnitario.toFixed(2)}` : 'N/A'}
`).join('')}
`;

    // Buscar dados de mercado específicos para o produto
    const produtosParaBuscar = [{ produto, marca, categoria }];
    const dadosMercado = await this.mercadoService.formatarDadosMercadoParaIA(
      produtosParaBuscar,
      regiao
    );

    // Buscar dados de concorrentes
    const dadosConcorrentes = await this.mercadoService.buscarDadosConcorrentes(
      produto,
      marca,
      categoria,
      regiao
    );

    // Combinar todos os dados
    let dadosCompletos = dadosProduto;
    if (dadosMercado) {
      dadosCompletos = `${dadosCompletos}\n\n${dadosMercado}`;
    }
    if (dadosConcorrentes) {
      dadosCompletos = `${dadosCompletos}\n\n${dadosConcorrentes}`;
    }

    // Criar pergunta padrão se não fornecida
    const perguntaFinal = pergunta || 
      `Analise o produto ${produto}${marca ? ` da marca ${marca}` : ''}${regiao ? ` na região ${regiao}` : ''}. 
      Forneça uma análise completa incluindo:
      1. Performance atual do produto
      2. Comparação com concorrentes e mercado
      3. Posicionamento competitivo
      4. Oportunidades de melhoria
      5. Recomendações estratégicas`;

    // Gerar análise usando IA
    const resultado = await this.openaiService.gerarAnalise(
      'oportunidade',
      dadosCompletos,
      perguntaFinal
    );

    // Criar atividade
    await prisma.atividade.create({
      data: {
        type: 'analise',
        description: `Análise do produto ${produto}${marca ? ` (${marca})` : ''} gerada`,
        status: 'concluida',
      },
    });

    return resultado;
  }
}

