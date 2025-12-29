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

    // Formatar TODAS as propostas com detalhes completos
    const propostasDetalhadas = propostas.map((p: any) => {
      const checkpointsInfo = (p.checkpoints || []).map((cp: any) => 
        `    - ${cp.label} (${new Date(cp.data).toLocaleDateString('pt-BR')}): ${cp.descricao || 'Sem descrição'}`
      ).join('\n');
      
      return `
  Proposta ID: ${p.id}
  Cliente: ${p.cliente}
  Valor: R$ ${p.valor.toFixed(2)}
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
    
    // Combinar com dados adicionais se fornecidos
    const dadosCompletos = dadosAdicionais 
      ? `${dadosReais}\n\n=== INFORMAÇÕES ADICIONAIS FORNECIDAS ===\n${dadosAdicionais}`
      : dadosReais;
    
    const resultado = await this.openaiService.gerarAnalise(tipo, dadosCompletos);

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

