import { prisma } from '../lib/prisma';
import { Proposta, PropostaStatus } from '../types';
import { CheckpointService } from './checkpoint.service';
import { AppError } from '../middleware/errorHandler';

export class PropostaService {
  private checkpointService: CheckpointService;

  constructor() {
    this.checkpointService = new CheckpointService();
  }
  async listar(): Promise<Proposta[]> {
    const propostas = await prisma.proposta.findMany({
      orderBy: { dataCriacao: 'desc' },
    });

    return propostas.map(this.mapToProposta);
  }

  async buscarPorId(id: string, incluirCheckpoints: boolean = true): Promise<Proposta | null> {
    const proposta = await prisma.proposta.findUnique({
      where: { id },
    });

    if (!proposta) return null;

    const propostaMapeada = this.mapToProposta(proposta);
    
    if (incluirCheckpoints) {
      propostaMapeada.checkpoints = await this.checkpointService.obterCheckpointsProposta(id);
    }

    return propostaMapeada;
  }

  async criar(dados: {
    cliente: string;
    valor: number;
    status?: PropostaStatus;
    dataVencimento: string;
    descricao?: string;
    observacoes?: string;
  }): Promise<Proposta> {
    const statusInicial = dados.status || 'rascunho';
    
    const proposta = await prisma.proposta.create({
      data: {
        cliente: dados.cliente,
        valor: dados.valor,
        status: statusInicial,
        dataVencimento: new Date(dados.dataVencimento),
        descricao: dados.descricao,
        observacoes: dados.observacoes,
      },
    });

    // Criar checkpoint inicial
    await this.checkpointService.criarCheckpointInicialProposta(proposta.id, statusInicial);

    // Criar atividade
    await this.criarAtividade('proposta', `Nova proposta criada para ${dados.cliente}`, proposta.status);

    const propostaMapeada = this.mapToProposta(proposta);
    propostaMapeada.checkpoints = await this.checkpointService.obterCheckpointsProposta(proposta.id);
    
    return propostaMapeada;
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
    // Buscar proposta atual para verificar mudança de status
    const propostaAtual = await prisma.proposta.findUnique({
      where: { id },
    });

      if (!propostaAtual) {
        throw new AppError('Proposta não encontrada', 'NOT_FOUND', 404);
      }

    const statusMudou = dados.status && dados.status !== propostaAtual.status;

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

    // Se status mudou, criar checkpoint
    if (statusMudou && dados.status) {
      await this.checkpointService.criarCheckpointProposta(
        id,
        dados.status,
        `Status alterado de ${propostaAtual.status} para ${dados.status}`,
        'sistema'
      );
    }

    // Criar atividade
    await this.criarAtividade('proposta', `Proposta atualizada para ${proposta.cliente}`, proposta.status);

    const propostaMapeada = this.mapToProposta(proposta);
    propostaMapeada.checkpoints = await this.checkpointService.obterCheckpointsProposta(id);

    return propostaMapeada;
  }

  async atualizarStatus(
    id: string,
    novoStatus: PropostaStatus,
    descricao?: string,
    usuario: string = 'sistema'
  ): Promise<Proposta> {
    try {
      const propostaAtual = await prisma.proposta.findUnique({
        where: { id },
      });

      if (!propostaAtual) {
        throw new AppError('Proposta não encontrada', 'NOT_FOUND', 404);
      }

      const statusAtual = propostaAtual.status as PropostaStatus;

      // Lista de status válidos (formato exato: snake_case, tudo minúsculas)
      const statusValidos: PropostaStatus[] = [
        'rascunho',
        'pendente',
        'enviada',
        'em_analise_gerente_compras',
        'em_analise_diretoria',
        'aprovada',
        'rejeitada',
        'cancelada',
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
        // Retornar proposta atualizada sem criar checkpoint duplicado
        const propostaMapeada = this.mapToProposta(propostaAtual);
        propostaMapeada.checkpoints = await this.checkpointService.obterCheckpointsProposta(id);
        return propostaMapeada;
      }

      // Atualizar status
      const proposta = await prisma.proposta.update({
        where: { id },
        data: { status: novoStatus },
      });

      // Criar checkpoint apenas se o status mudou
      try {
        await this.checkpointService.criarCheckpointProposta(id, novoStatus, descricao, usuario);
      } catch (checkpointError: any) {
        console.error('Erro ao criar checkpoint:', checkpointError);
        // Se a tabela não existir, apenas loga o erro mas continua
        // Isso permite que funcione mesmo sem migração completa
        if (checkpointError.message?.includes('Table') || checkpointError.code === 'P2021') {
          console.warn('Tabela de checkpoints não encontrada. Execute a migração: npm run prisma:migrate');
        } else {
          throw checkpointError;
        }
      }

      // Criar atividade
      await this.criarAtividade('proposta', `Status da proposta alterado para ${novoStatus}`, novoStatus);

      const propostaMapeada = this.mapToProposta(proposta);
      
      // Tentar obter checkpoints, mas não falhar se não existir
      try {
        propostaMapeada.checkpoints = await this.checkpointService.obterCheckpointsProposta(id);
      } catch (checkpointError: any) {
        console.warn('Não foi possível obter checkpoints:', checkpointError.message);
        propostaMapeada.checkpoints = [];
      }

      return propostaMapeada;
    } catch (error: any) {
      console.error('Erro em atualizarStatus:', error);
      throw error;
    }
  }

  async deletar(id: string): Promise<void> {
    await prisma.proposta.delete({
      where: { id },
    });
  }

  async contarPendentes(): Promise<number> {
    return prisma.proposta.count({
      where: { 
        status: {
          in: ['pendente', 'enviada', 'em_analise_gerente_compras', 'em_analise_diretoria']
        }
      },
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

