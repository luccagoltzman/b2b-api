import { OpenAIService } from './openai.service';
import { prisma } from '../lib/prisma';
import { PropostaService } from './proposta.service';
import { VisitaService } from './visita.service';
import { DashboardService } from './dashboard.service';

export class AnaliseService {
  private openaiService: OpenAIService;
  private propostaService: PropostaService;
  private visitaService: VisitaService;
  private dashboardService: DashboardService;

  constructor() {
    this.openaiService = OpenAIService.getInstance();
    this.propostaService = new PropostaService();
    this.visitaService = new VisitaService();
    this.dashboardService = new DashboardService();
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

  async gerarAnalise(
    tipo: 'performance' | 'concorrencia' | 'tendencia' | 'oportunidade',
    dadosAdicionais?: string
  ): Promise<string> {
    // Coletar dados reais do banco
    const dadosReais = await this.coletarDadosReais();
    
    // Extrair pergunta do usuário se fornecida
    let perguntaUsuario: string | undefined;
    let dadosCompletos = dadosReais;
    
    if (dadosAdicionais) {
      const perguntaLimpa = dadosAdicionais.trim();
      
      // Detectar se é uma pergunta:
      // 1. Termina com interrogação
      // 2. É uma frase curta/média (até 300 caracteres)
      // 3. Contém palavras interrogativas (quais, qual, como, quando, onde, por que, etc.)
      const palavrasInterrogativas = ['quais', 'qual', 'como', 'quando', 'onde', 'por que', 'porque', 'quem', 'o que', 'que'];
      const temInterrogacao = perguntaLimpa.includes('?');
      const temPalavraInterrogativa = palavrasInterrogativas.some(palavra => 
        perguntaLimpa.toLowerCase().startsWith(palavra) || 
        perguntaLimpa.toLowerCase().includes(` ${palavra} `)
      );
      const eFraseCurta = perguntaLimpa.length < 300;
      
      // Se parecer uma pergunta, tratar como pergunta do usuário
      if (temInterrogacao || (temPalavraInterrogativa && eFraseCurta)) {
        perguntaUsuario = perguntaLimpa;
        // Manter apenas os dados do sistema para análise
        dadosCompletos = dadosReais;
      } else {
        // Se for texto longo ou não parecer pergunta, tratar como dados adicionais
        dadosCompletos = `${dadosReais}\n\n=== INFORMAÇÕES ADICIONAIS FORNECIDAS ===\n${dadosAdicionais}`;
      }
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

      // Separar produto e marca
      const [produto, marca] = produtoMarca.split(' - ');

      return {
        produto,
        marca,
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
}

