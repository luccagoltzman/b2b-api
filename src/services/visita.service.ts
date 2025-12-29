import { prisma } from '../lib/prisma';
import { Visita, VisitaStatus } from '../types';

export class VisitaService {
  async listar(): Promise<Visita[]> {
    const visitas = await prisma.visita.findMany({
      orderBy: { data: 'desc' },
    });

    return visitas.map(this.mapToVisita);
  }

  async buscarPorId(id: string): Promise<Visita | null> {
    const visita = await prisma.visita.findUnique({
      where: { id },
    });

    return visita ? this.mapToVisita(visita) : null;
  }

  async criar(dados: {
    cliente: string;
    data: string;
    hora: string;
    status?: VisitaStatus;
    endereco?: string;
    observacoes?: string;
  }): Promise<Visita> {
    const visita = await prisma.visita.create({
      data: {
        cliente: dados.cliente,
        data: new Date(dados.data),
        hora: dados.hora,
        status: dados.status || 'agendada',
        endereco: dados.endereco,
        observacoes: dados.observacoes,
      },
    });

    // Criar atividade
    await this.criarAtividade('visita', `Nova visita agendada para ${dados.cliente}`, visita.status);

    return this.mapToVisita(visita);
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

    // Criar atividade
    await this.criarAtividade('visita', `Visita atualizada para ${visita.cliente}`, visita.status);

    return this.mapToVisita(visita);
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

