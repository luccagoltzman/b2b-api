import { prisma } from '../lib/prisma';
import { Proposta, PropostaStatus } from '../types';

export class PropostaService {
  async listar(): Promise<Proposta[]> {
    const propostas = await prisma.proposta.findMany({
      orderBy: { dataCriacao: 'desc' },
    });

    return propostas.map(this.mapToProposta);
  }

  async buscarPorId(id: string): Promise<Proposta | null> {
    const proposta = await prisma.proposta.findUnique({
      where: { id },
    });

    return proposta ? this.mapToProposta(proposta) : null;
  }

  async criar(dados: {
    cliente: string;
    valor: number;
    status?: PropostaStatus;
    dataVencimento: string;
    descricao?: string;
    observacoes?: string;
  }): Promise<Proposta> {
    const proposta = await prisma.proposta.create({
      data: {
        cliente: dados.cliente,
        valor: dados.valor,
        status: dados.status || 'pendente',
        dataVencimento: new Date(dados.dataVencimento),
        descricao: dados.descricao,
        observacoes: dados.observacoes,
      },
    });

    // Criar atividade
    await this.criarAtividade('proposta', `Nova proposta criada para ${dados.cliente}`, proposta.status);

    return this.mapToProposta(proposta);
  }

  async atualizar(
    id: string,
    dados: Partial<{
      cliente: string;
      valor: number;
      status: PropostaStatus;
      dataVencimento: string;
      descricao: string;
      observacoes: string;
    }>
  ): Promise<Proposta> {
    const proposta = await prisma.proposta.update({
      where: { id },
      data: {
        ...(dados.cliente && { cliente: dados.cliente }),
        ...(dados.valor !== undefined && { valor: dados.valor }),
        ...(dados.status && { status: dados.status }),
        ...(dados.dataVencimento && { dataVencimento: new Date(dados.dataVencimento) }),
        ...(dados.descricao !== undefined && { descricao: dados.descricao }),
        ...(dados.observacoes !== undefined && { observacoes: dados.observacoes }),
      },
    });

    // Criar atividade
    await this.criarAtividade('proposta', `Proposta atualizada para ${proposta.cliente}`, proposta.status);

    return this.mapToProposta(proposta);
  }

  async deletar(id: string): Promise<void> {
    await prisma.proposta.delete({
      where: { id },
    });
  }

  async contarPendentes(): Promise<number> {
    return prisma.proposta.count({
      where: { status: 'pendente' },
    });
  }

  async calcularReceitaMensal(): Promise<number> {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const propostasAprovadas = await prisma.proposta.findMany({
      where: {
        status: 'aprovada',
        dataCriacao: {
          gte: inicioMes,
        },
      },
    });

    return propostasAprovadas.reduce((total, proposta) => total + proposta.valor, 0);
  }

  private mapToProposta(proposta: any): Proposta {
    return {
      id: proposta.id,
      cliente: proposta.cliente,
      valor: proposta.valor,
      status: proposta.status as PropostaStatus,
      dataCriacao: proposta.dataCriacao.toISOString(),
      dataVencimento: proposta.dataVencimento.toISOString(),
      descricao: proposta.descricao || undefined,
      observacoes: proposta.observacoes || undefined,
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

