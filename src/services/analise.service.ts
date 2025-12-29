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
    // Coletar estatísticas
    const stats = await this.dashboardService.obterEstatisticas();
    
    // Coletar propostas
    const propostas = await this.propostaService.listar();
    const propostasPorStatus = propostas.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const valorTotalPropostas = propostas.reduce((sum, p) => sum + p.valor, 0);
    const valorMedioProposta = propostas.length > 0 ? valorTotalPropostas / propostas.length : 0;
    
    // Coletar visitas
    const visitas = await this.visitaService.listar();
    const visitasPorStatus = visitas.reduce((acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Coletar clientes únicos
    const clientesPropostas = new Set(propostas.map(p => p.cliente));
    const clientesVisitas = new Set(visitas.map(v => v.cliente));
    const totalClientes = new Set([...clientesPropostas, ...clientesVisitas]).size;
    
    // Propostas recentes (últimos 30 dias)
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    const propostasRecentes = propostas.filter(p => 
      new Date(p.dataCriacao) >= trintaDiasAtras
    );
    
    // Visitas recentes
    const visitasRecentes = visitas.filter(v => 
      new Date(v.data) >= trintaDiasAtras
    );
    
    // Propostas próximas do vencimento (próximos 7 dias)
    const hoje = new Date();
    const seteDiasFrente = new Date();
    seteDiasFrente.setDate(seteDiasFrente.getDate() + 7);
    const propostasVencendo = propostas.filter(p => {
      const vencimento = new Date(p.dataVencimento);
      return vencimento >= hoje && vencimento <= seteDiasFrente && p.status === 'pendente';
    });
    
    // Top clientes por valor
    const clientesPorValor = propostas.reduce((acc, p) => {
      if (!acc[p.cliente]) acc[p.cliente] = 0;
      acc[p.cliente] += p.valor;
      return acc;
    }, {} as Record<string, number>);
    const topClientes = Object.entries(clientesPorValor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cliente, valor]) => ({ cliente, valor }));

    // Formatar dados para a IA
    const dadosFormatados = `
=== ESTATÍSTICAS GERAIS ===
- Total de visitas: ${stats.totalVisitas}
- Taxa de conversão: ${stats.taxaConversao.toFixed(2)}%
- Propostas pendentes: ${stats.propostasPendentes}
- Receita mensal: R$ ${stats.receitaMensal.toFixed(2)}

=== PROPOSTAS ===
- Total de propostas: ${propostas.length}
- Propostas por status:
  * Pendentes: ${propostasPorStatus['pendente'] || 0}
  * Aprovadas: ${propostasPorStatus['aprovada'] || 0}
  * Rejeitadas: ${propostasPorStatus['rejeitada'] || 0}
  * Enviadas: ${propostasPorStatus['enviada'] || 0}
- Valor total em propostas: R$ ${valorTotalPropostas.toFixed(2)}
- Valor médio por proposta: R$ ${valorMedioProposta.toFixed(2)}
- Propostas criadas nos últimos 30 dias: ${propostasRecentes.length}
- Propostas vencendo nos próximos 7 dias: ${propostasVencendo.length}

=== VISITAS ===
- Total de visitas: ${visitas.length}
- Visitas por status:
  * Agendadas: ${visitasPorStatus['agendada'] || 0}
  * Realizadas: ${visitasPorStatus['realizada'] || 0}
  * Canceladas: ${visitasPorStatus['cancelada'] || 0}
  * Reagendadas: ${visitasPorStatus['reagendada'] || 0}
- Visitas realizadas nos últimos 30 dias: ${visitasRecentes.length}

=== CLIENTES ===
- Total de clientes únicos: ${totalClientes}
- Top 5 clientes por valor:
${topClientes.map((c, i) => `  ${i + 1}. ${c.cliente}: R$ ${c.valor.toFixed(2)}`).join('\n')}

=== DETALHES DAS PROPOSTAS PENDENTES ===
${propostas.filter(p => p.status === 'pendente').slice(0, 10).map(p => 
  `- ${p.cliente}: R$ ${p.valor.toFixed(2)} (Vence em: ${new Date(p.dataVencimento).toLocaleDateString('pt-BR')})`
).join('\n')}

=== PROPOSTAS VENCENDO EM BREVE ===
${propostasVencendo.map(p => 
  `- ${p.cliente}: R$ ${p.valor.toFixed(2)} (Vence em: ${new Date(p.dataVencimento).toLocaleDateString('pt-BR')})`
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

