import { prisma } from '../lib/prisma';
import { DashboardStats, Atividade } from '../types';
import { PropostaService } from './proposta.service';
import { VisitaService } from './visita.service';

export class DashboardService {
  private propostaService: PropostaService;
  private visitaService: VisitaService;

  constructor() {
    this.propostaService = new PropostaService();
    this.visitaService = new VisitaService();
  }

  async obterEstatisticas(): Promise<DashboardStats> {
    const totalVisitas = await this.visitaService.contarTotal();
    const visitasRealizadas = await this.visitaService.contarRealizadas();
    const propostasPendentes = await this.propostaService.contarPendentes();
    const receitaMensal = await this.propostaService.calcularReceitaMensal();

    // Calcular taxa de conversão: visitas realizadas que geraram propostas aprovadas
    const visitasRealizadasIds = await prisma.visita.findMany({
      where: { status: 'realizada' },
      select: { cliente: true },
    });

    const clientesComVisitas = new Set(visitasRealizadasIds.map((v) => v.cliente));
    const propostasAprovadas = await prisma.proposta.findMany({
      where: {
        status: 'aprovada',
        cliente: { in: Array.from(clientesComVisitas) },
      },
    });

    const taxaConversao =
      visitasRealizadas > 0
        ? (propostasAprovadas.length / visitasRealizadas) * 100
        : 0;

    return {
      totalVisitas,
      taxaConversao: Math.round(taxaConversao * 100) / 100,
      propostasPendentes,
      receitaMensal: Math.round(receitaMensal * 100) / 100,
    };
  }

  async obterAtividadesRecentes(limite: number = 10): Promise<Atividade[]> {
    const atividades = await prisma.atividade.findMany({
      take: limite,
      orderBy: { timestamp: 'desc' },
    });

    return atividades.map((atividade) => ({
      id: atividade.id,
      type: atividade.type as 'visita' | 'proposta' | 'analise',
      description: atividade.description,
      timestamp: atividade.timestamp.toISOString(),
      status: atividade.status,
    }));
  }

  async obterSugestoes(): Promise<string[]> {
    const stats = await this.obterEstatisticas();
    const atividades = await this.obterAtividadesRecentes(5);
    const propostasPendentes = await prisma.proposta.findMany({
      where: { status: 'pendente' },
      orderBy: { dataVencimento: 'asc' },
      take: 5,
    });

    const sugestoes: string[] = [];

    // Sugestão baseada em taxa de conversão
    if (stats.taxaConversao < 30) {
      sugestoes.push(
        `Taxa de conversão está em ${stats.taxaConversao.toFixed(1)}%. Considere melhorar o acompanhamento pós-visita para aumentar conversões.`
      );
    }

    // Sugestão baseada em propostas pendentes
    if (stats.propostasPendentes > 5) {
      sugestoes.push(
        `Você tem ${stats.propostasPendentes} propostas pendentes. Priorize o acompanhamento das mais próximas do vencimento.`
      );
    }

    // Sugestão baseada em propostas próximas do vencimento
    const hoje = new Date();
    const propostasVencendo = propostasPendentes.filter((p) => {
      const vencimento = new Date(p.dataVencimento);
      const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return diasRestantes <= 3 && diasRestantes >= 0;
    });

    if (propostasVencendo.length > 0) {
      sugestoes.push(
        `${propostasVencendo.length} proposta(s) vence(m) nos próximos 3 dias. Ação urgente recomendada.`
      );
    }

    // Sugestão baseada em receita mensal
    if (stats.receitaMensal === 0) {
      sugestoes.push('Nenhuma receita registrada este mês. Foque em converter propostas pendentes.');
    }

    // Sugestão baseada em atividades recentes
    const ultimaAtividade = atividades[0];
    if (ultimaAtividade) {
      const ultimaData = new Date(ultimaAtividade.timestamp);
      const diasSemAtividade = Math.floor(
        (hoje.getTime() - ultimaData.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diasSemAtividade > 7) {
        sugestoes.push(
          `Nenhuma atividade registrada nos últimos ${diasSemAtividade} dias. Considere agendar novas visitas.`
        );
      }
    }

    return sugestoes.length > 0 ? sugestoes : ['Tudo parece estar em ordem! Continue o bom trabalho.'];
  }
}

