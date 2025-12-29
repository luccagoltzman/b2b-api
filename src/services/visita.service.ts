import { prisma } from '../lib/prisma';
import { Visita, VisitaStatus } from '../types';
import { CheckpointService } from './checkpoint.service';
import { AppError } from '../middleware/errorHandler';

export class VisitaService {
  private checkpointService: CheckpointService;

  constructor() {
    this.checkpointService = new CheckpointService();
  }
  async listar(): Promise<Visita[]> {
    const visitas = await prisma.visita.findMany({
      orderBy: { data: 'desc' },
    });

    return visitas.map(this.mapToVisita);
  }

  async buscarPorId(id: string, incluirCheckpoints: boolean = true): Promise<Visita | null> {
    const visita = await prisma.visita.findUnique({
      where: { id },
    });

    if (!visita) return null;

    const visitaMapeada = this.mapToVisita(visita);
    
    if (incluirCheckpoints) {
      visitaMapeada.checkpoints = await this.checkpointService.obterCheckpointsVisita(id);
    }

    return visitaMapeada;
  }

  async criar(dados: {
    cliente: string;
    data: string;
    hora: string;
    status?: VisitaStatus;
    endereco?: string;
    observacoes?: string;
  }): Promise<Visita> {
    const statusInicial = dados.status || 'agendada';
    
    const visita = await prisma.visita.create({
      data: {
        cliente: dados.cliente,
        data: new Date(dados.data),
        hora: dados.hora,
        status: statusInicial,
        endereco: dados.endereco,
        observacoes: dados.observacoes,
      },
    });

    // Criar checkpoint inicial
    await this.checkpointService.criarCheckpointInicialVisita(visita.id, statusInicial);

    // Criar atividade
    await this.criarAtividade('visita', `Nova visita agendada para ${dados.cliente}`, visita.status);

    const visitaMapeada = this.mapToVisita(visita);
    visitaMapeada.checkpoints = await this.checkpointService.obterCheckpointsVisita(visita.id);

    return visitaMapeada;
  }

  async atualizar(
    id: string,
    dados: Partial<{
      cliente: string;
      data: string;
      hora: string;
      status: VisitaStatus;
      endereco: string;
      observacoes: string;
    }>
  ): Promise<Visita> {
    // Buscar visita atual para verificar mudança de status
    const visitaAtual = await prisma.visita.findUnique({
      where: { id },
    });

    if (!visitaAtual) {
      throw new AppError('Visita não encontrada', 'NOT_FOUND', 404);
    }

    const statusMudou = dados.status && dados.status !== visitaAtual.status;

    const visita = await prisma.visita.update({
      where: { id },
      data: {
        ...(dados.cliente && { cliente: dados.cliente }),
        ...(dados.data && { data: new Date(dados.data) }),
        ...(dados.hora && { hora: dados.hora }),
        ...(dados.status && { status: dados.status }),
        ...(dados.endereco !== undefined && { endereco: dados.endereco }),
        ...(dados.observacoes !== undefined && { observacoes: dados.observacoes }),
      },
    });

    // Se status mudou, criar checkpoint
    if (statusMudou && dados.status) {
      await this.checkpointService.criarCheckpointVisita(
        id,
        dados.status,
        `Status alterado de ${visitaAtual.status} para ${dados.status}`,
        'sistema'
      );
    }

    // Criar atividade
    await this.criarAtividade('visita', `Visita atualizada para ${visita.cliente}`, visita.status);

    const visitaMapeada = this.mapToVisita(visita);
    visitaMapeada.checkpoints = await this.checkpointService.obterCheckpointsVisita(id);

    return visitaMapeada;
  }

  async atualizarStatus(
    id: string,
    novoStatus: VisitaStatus,
    descricao?: string,
    usuario: string = 'sistema'
  ): Promise<Visita> {
    const visitaAtual = await prisma.visita.findUnique({
      where: { id },
    });

    if (!visitaAtual) {
      throw new AppError('Visita não encontrada', 'NOT_FOUND', 404);
    }

    const statusAtual = visitaAtual.status as VisitaStatus;

    // Lista de status válidos (formato exato: snake_case, tudo minúsculas)
    const statusValidos: VisitaStatus[] = [
      'agendada',
      'confirmada',
      'em_andamento',
      'realizada',
      'cancelada',
      'reagendada',
    ];

    // Validar que o novo status existe na lista de status válidos
    if (!statusValidos.includes(novoStatus)) {
      throw new AppError(
        `Status inválido: "${novoStatus}". Status válidos: ${statusValidos.join(', ')}`,
        'INVALID_STATUS',
        400
      );
    }

    // Não criar checkpoint se o status não mudou
    if (statusAtual === novoStatus) {
      // Retornar visita atualizada sem criar checkpoint duplicado
      const visitaMapeada = this.mapToVisita(visitaAtual);
      visitaMapeada.checkpoints = await this.checkpointService.obterCheckpointsVisita(id);
      return visitaMapeada;
    }

    // Atualizar status
    const visita = await prisma.visita.update({
      where: { id },
      data: { status: novoStatus },
    });

    // Criar checkpoint
    await this.checkpointService.criarCheckpointVisita(id, novoStatus, descricao, usuario);

    // Criar atividade
    await this.criarAtividade('visita', `Status da visita alterado para ${novoStatus}`, novoStatus);

    const visitaMapeada = this.mapToVisita(visita);
    visitaMapeada.checkpoints = await this.checkpointService.obterCheckpointsVisita(id);

    return visitaMapeada;
  }

  async deletar(id: string): Promise<void> {
    await prisma.visita.delete({
      where: { id },
    });
  }

  async contarTotal(): Promise<number> {
    return prisma.visita.count();
  }

  async contarRealizadas(): Promise<number> {
    return prisma.visita.count({
      where: { status: 'realizada' },
    });
  }

  private mapToVisita(visita: any): Visita {
    return {
      id: visita.id,
      cliente: visita.cliente,
      data: visita.data.toISOString().split('T')[0],
      hora: visita.hora,
      status: visita.status as VisitaStatus,
      endereco: visita.endereco || undefined,
      observacoes: visita.observacoes || undefined,
    };
  }

  private async criarAtividade(type: string, description: string, status: string): Promise<void> {
    await prisma.atividade.create({
      data: {
        type,
        description,
        status,
      },
    });
  }
}

