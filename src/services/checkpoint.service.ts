import { prisma } from '../lib/prisma';
import { Checkpoint, PropostaStatus, VisitaStatus } from '../types';

// Labels legíveis para os status
const PROPOSTA_STATUS_LABELS: Record<PropostaStatus, string> = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  enviada: 'Enviada',
  em_analise_gerente_compras: 'Em Análise - Gerente de Compras',
  em_analise_diretoria: 'Em Análise - Diretoria',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  cancelada: 'Cancelada',
};

const VISITA_STATUS_LABELS: Record<VisitaStatus, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  em_andamento: 'Em Andamento',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
  reagendada: 'Reagendada',
};

// Fluxos válidos de transição de status
const PROPOSTA_STATUS_FLOW: Record<PropostaStatus, PropostaStatus[]> = {
  rascunho: ['pendente', 'cancelada'],
  pendente: ['enviada', 'cancelada'],
  enviada: ['em_analise_gerente_compras', 'rejeitada', 'cancelada'],
  em_analise_gerente_compras: ['em_analise_diretoria', 'rejeitada', 'cancelada'],
  em_analise_diretoria: ['aprovada', 'rejeitada', 'cancelada'],
  aprovada: [], // Status final
  rejeitada: [], // Status final
  cancelada: [], // Status final
};

const VISITA_STATUS_FLOW: Record<VisitaStatus, VisitaStatus[]> = {
  agendada: ['confirmada', 'cancelada', 'reagendada'],
  confirmada: ['em_andamento', 'cancelada', 'reagendada'],
  em_andamento: ['realizada', 'cancelada'],
  realizada: [], // Status final
  cancelada: [], // Status final
  reagendada: ['agendada', 'confirmada', 'cancelada'],
};

export class CheckpointService {
  private getLabel(status: string, type: 'proposta' | 'visita'): string {
    if (type === 'proposta') {
      return PROPOSTA_STATUS_LABELS[status as PropostaStatus] || status;
    }
    return VISITA_STATUS_LABELS[status as VisitaStatus] || status;
  }

  async criarCheckpointProposta(
    propostaId: string,
    status: PropostaStatus,
    descricao?: string,
    usuario: string = 'sistema'
  ): Promise<Checkpoint> {
    const checkpoint = await prisma.checkpoint.create({
      data: {
        propostaId,
        status,
        label: this.getLabel(status, 'proposta'),
        descricao,
        usuario,
        data: new Date(),
      },
    });

    return {
      id: checkpoint.id,
      status: checkpoint.status,
      label: checkpoint.label,
      descricao: checkpoint.descricao || undefined,
      data: checkpoint.data.toISOString(),
      usuario: checkpoint.usuario || undefined,
    };
  }

  async criarCheckpointVisita(
    visitaId: string,
    status: VisitaStatus,
    descricao?: string,
    usuario: string = 'sistema'
  ): Promise<Checkpoint> {
    const checkpoint = await prisma.checkpoint.create({
      data: {
        visitaId,
        status,
        label: this.getLabel(status, 'visita'),
        descricao,
        usuario,
        data: new Date(),
      },
    });

    return {
      id: checkpoint.id,
      status: checkpoint.status,
      label: checkpoint.label,
      descricao: checkpoint.descricao || undefined,
      data: checkpoint.data.toISOString(),
      usuario: checkpoint.usuario || undefined,
    };
  }

  async obterCheckpointsProposta(propostaId: string): Promise<Checkpoint[]> {
    const checkpoints = await prisma.checkpoint.findMany({
      where: { propostaId },
      orderBy: { data: 'desc' }, // Mais recente primeiro (para timeline)
    });

    return checkpoints.map((cp) => ({
      id: cp.id,
      status: cp.status,
      label: cp.label,
      descricao: cp.descricao || undefined,
      data: cp.data.toISOString(),
      usuario: cp.usuario || undefined,
    }));
  }

  async obterCheckpointsVisita(visitaId: string): Promise<Checkpoint[]> {
    const checkpoints = await prisma.checkpoint.findMany({
      where: { visitaId },
      orderBy: { data: 'desc' }, // Mais recente primeiro (para timeline)
    });

    return checkpoints.map((cp) => ({
      id: cp.id,
      status: cp.status,
      label: cp.label,
      descricao: cp.descricao || undefined,
      data: cp.data.toISOString(),
      usuario: cp.usuario || undefined,
    }));
  }

  validarTransicaoProposta(
    statusAtual: PropostaStatus,
    novoStatus: PropostaStatus
  ): boolean {
    const transicoesValidas = PROPOSTA_STATUS_FLOW[statusAtual] || [];
    return transicoesValidas.includes(novoStatus);
  }

  validarTransicaoVisita(
    statusAtual: VisitaStatus,
    novoStatus: VisitaStatus
  ): boolean {
    const transicoesValidas = VISITA_STATUS_FLOW[statusAtual] || [];
    return transicoesValidas.includes(novoStatus);
  }

  async criarCheckpointInicialProposta(
    propostaId: string,
    status: PropostaStatus = 'rascunho'
  ): Promise<Checkpoint> {
    return this.criarCheckpointProposta(
      propostaId,
      status,
      'Proposta criada',
      'sistema'
    );
  }

  async criarCheckpointInicialVisita(
    visitaId: string,
    status: VisitaStatus = 'agendada'
  ): Promise<Checkpoint> {
    return this.criarCheckpointVisita(
      visitaId,
      status,
      'Visita agendada',
      'sistema'
    );
  }
}

