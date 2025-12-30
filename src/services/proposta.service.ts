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
    produto?: string;
    marca?: string;
    categoria?: string;
    unidadeMedida?: string;
    produtoCodigo?: string;
    aliquotaIpi?: number;
    valorUnitario?: number;
    quantidade?: number;
    desconto?: number;
    descontoTipo?: 'percentual' | 'valor';
    valorFrete?: number;
    condicoesPagamento?: string;
    prazoEntrega?: string;
    tipoPedido?: string;
    transportadora?: string;
    informacoesAdicionais?: string;
    estrategiaRepresentacao?: string;
    publicoAlvo?: string;
    diferenciaisCompetitivos?: string;
    clienteCnpj?: string;
    clienteEndereco?: string;
    clienteNumero?: string;
    clienteBairro?: string;
    clienteCidade?: string;
    clienteCep?: string;
    clienteEstado?: string;
    clienteTelefone?: string;
    clienteEmail?: string;
    clienteNomeFantasia?: string;
    quantidadeAdquirida?: number;
    valorCompra?: number;
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
        produto: dados.produto,
        marca: dados.marca,
        categoria: dados.categoria,
        unidadeMedida: dados.unidadeMedida || 'unidade',
        produtoCodigo: dados.produtoCodigo,
        aliquotaIpi: dados.aliquotaIpi,
        valorUnitario: dados.valorUnitario,
        quantidade: dados.quantidade,
        desconto: dados.desconto,
        descontoTipo: dados.descontoTipo || 'percentual',
        valorFrete: dados.valorFrete,
        condicoesPagamento: dados.condicoesPagamento,
        prazoEntrega: dados.prazoEntrega,
        tipoPedido: dados.tipoPedido || 'venda',
        transportadora: dados.transportadora,
        informacoesAdicionais: dados.informacoesAdicionais,
        estrategiaRepresentacao: dados.estrategiaRepresentacao,
        publicoAlvo: dados.publicoAlvo,
        diferenciaisCompetitivos: dados.diferenciaisCompetitivos,
        clienteCnpj: dados.clienteCnpj,
        clienteEndereco: dados.clienteEndereco,
        clienteNumero: dados.clienteNumero,
        clienteBairro: dados.clienteBairro,
        clienteCidade: dados.clienteCidade,
        clienteCep: dados.clienteCep,
        clienteEstado: dados.clienteEstado,
        clienteTelefone: dados.clienteTelefone,
        clienteEmail: dados.clienteEmail,
        clienteNomeFantasia: dados.clienteNomeFantasia,
        quantidadeAdquirida: dados.quantidadeAdquirida,
        valorCompra: dados.valorCompra,
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
      produto: string;
      marca: string;
      categoria: string;
      unidadeMedida: string;
      produtoCodigo: string;
      aliquotaIpi: number;
      valorUnitario: number;
      quantidade: number;
      desconto: number;
      descontoTipo: 'percentual' | 'valor';
      valorFrete: number;
      condicoesPagamento: string;
      prazoEntrega: string;
      tipoPedido: string;
      transportadora: string;
      informacoesAdicionais: string;
      estrategiaRepresentacao: string;
      publicoAlvo: string;
      diferenciaisCompetitivos: string;
      clienteCnpj: string;
      clienteEndereco: string;
      clienteNumero: string;
      clienteBairro: string;
      clienteCidade: string;
      clienteCep: string;
      clienteEstado: string;
      clienteTelefone: string;
      clienteEmail: string;
      clienteNomeFantasia: string;
      quantidadeAdquirida: number;
      valorCompra: number;
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
        ...(dados.produto !== undefined && { produto: dados.produto }),
        ...(dados.marca !== undefined && { marca: dados.marca }),
        ...(dados.categoria !== undefined && { categoria: dados.categoria }),
        ...(dados.unidadeMedida !== undefined && { unidadeMedida: dados.unidadeMedida }),
        ...(dados.produtoCodigo !== undefined && { produtoCodigo: dados.produtoCodigo }),
        ...(dados.aliquotaIpi !== undefined && { aliquotaIpi: dados.aliquotaIpi }),
        ...(dados.valorUnitario !== undefined && { valorUnitario: dados.valorUnitario }),
        ...(dados.quantidade !== undefined && { quantidade: dados.quantidade }),
        ...(dados.desconto !== undefined && { desconto: dados.desconto }),
        ...(dados.descontoTipo !== undefined && { descontoTipo: dados.descontoTipo }),
        ...(dados.valorFrete !== undefined && { valorFrete: dados.valorFrete }),
        ...(dados.condicoesPagamento !== undefined && { condicoesPagamento: dados.condicoesPagamento }),
        ...(dados.prazoEntrega !== undefined && { prazoEntrega: dados.prazoEntrega }),
        ...(dados.tipoPedido !== undefined && { tipoPedido: dados.tipoPedido }),
        ...(dados.transportadora !== undefined && { transportadora: dados.transportadora }),
        ...(dados.informacoesAdicionais !== undefined && { informacoesAdicionais: dados.informacoesAdicionais }),
        ...(dados.estrategiaRepresentacao !== undefined && { estrategiaRepresentacao: dados.estrategiaRepresentacao }),
        ...(dados.publicoAlvo !== undefined && { publicoAlvo: dados.publicoAlvo }),
        ...(dados.diferenciaisCompetitivos !== undefined && { diferenciaisCompetitivos: dados.diferenciaisCompetitivos }),
        ...(dados.clienteCnpj !== undefined && { clienteCnpj: dados.clienteCnpj }),
        ...(dados.clienteEndereco !== undefined && { clienteEndereco: dados.clienteEndereco }),
        ...(dados.clienteNumero !== undefined && { clienteNumero: dados.clienteNumero }),
        ...(dados.clienteBairro !== undefined && { clienteBairro: dados.clienteBairro }),
        ...(dados.clienteCidade !== undefined && { clienteCidade: dados.clienteCidade }),
        ...(dados.clienteCep !== undefined && { clienteCep: dados.clienteCep }),
        ...(dados.clienteEstado !== undefined && { clienteEstado: dados.clienteEstado }),
        ...(dados.clienteTelefone !== undefined && { clienteTelefone: dados.clienteTelefone }),
        ...(dados.clienteEmail !== undefined && { clienteEmail: dados.clienteEmail }),
        ...(dados.clienteNomeFantasia !== undefined && { clienteNomeFantasia: dados.clienteNomeFantasia }),
        ...(dados.quantidadeAdquirida !== undefined && { quantidadeAdquirida: dados.quantidadeAdquirida }),
        ...(dados.valorCompra !== undefined && { valorCompra: dados.valorCompra }),
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
    usuario: string = 'sistema',
    quantidadeAdquirida?: number,
    valorCompra?: number
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

      // Se for aprovar, usar valores padrão se não fornecidos
      if (novoStatus === 'aprovada') {
        // Se quantidadeAdquirida não for fornecida, usar quantidade como padrão
        if (quantidadeAdquirida === undefined || quantidadeAdquirida === null) {
          if (propostaAtual.quantidade && propostaAtual.quantidade > 0) {
            quantidadeAdquirida = propostaAtual.quantidade;
          } else {
            throw new AppError(
              'Ao aprovar uma proposta, o campo quantidadeAdquirida é obrigatório. Se não fornecido, a proposta deve ter o campo quantidade preenchido.',
              'VALIDATION_ERROR',
              400
            );
          }
        }
        
        // Validar que quantidadeAdquirida é positiva
        if (quantidadeAdquirida <= 0) {
          throw new AppError(
            'Ao aprovar uma proposta, o campo quantidadeAdquirida deve ser um número positivo',
            'VALIDATION_ERROR',
            400
          );
        }

        // Se valorCompra não for fornecido, usar valor como padrão
        if (valorCompra === undefined || valorCompra === null) {
          if (propostaAtual.valor && propostaAtual.valor > 0) {
            valorCompra = propostaAtual.valor;
          } else {
            throw new AppError(
              'Ao aprovar uma proposta, o campo valorCompra é obrigatório. Se não fornecido, a proposta deve ter o campo valor preenchido.',
              'VALIDATION_ERROR',
              400
            );
          }
        }
        
        // Validar que valorCompra é positivo
        if (valorCompra <= 0) {
          throw new AppError(
            'Ao aprovar uma proposta, o campo valorCompra deve ser um número positivo',
            'VALIDATION_ERROR',
            400
          );
        }
      }

      // Não criar checkpoint se o status não mudou
      if (statusAtual === novoStatus) {
        // Retornar proposta atualizada sem criar checkpoint duplicado
        const propostaMapeada = this.mapToProposta(propostaAtual);
        propostaMapeada.checkpoints = await this.checkpointService.obterCheckpointsProposta(id);
        return propostaMapeada;
      }

      // Preparar dados de atualização
      const dadosAtualizacao: any = { status: novoStatus };
      
      // Se for aprovada, sempre atualizar dados de compra (já validados acima)
      if (novoStatus === 'aprovada') {
        dadosAtualizacao.quantidadeAdquirida = quantidadeAdquirida;
        dadosAtualizacao.valorCompra = valorCompra;
      }

      // Atualizar status e dados de compra (se fornecidos)
      const proposta = await prisma.proposta.update({
        where: { id },
        data: dadosAtualizacao,
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
      produto: proposta.produto || undefined,
      marca: proposta.marca || undefined,
      categoria: proposta.categoria || undefined,
      unidadeMedida: proposta.unidadeMedida || undefined,
      produtoCodigo: proposta.produtoCodigo || undefined,
      aliquotaIpi: proposta.aliquotaIpi || undefined,
      valorUnitario: proposta.valorUnitario || undefined,
      quantidade: proposta.quantidade || undefined,
      desconto: proposta.desconto || undefined,
      descontoTipo: proposta.descontoTipo || undefined,
      valorFrete: proposta.valorFrete || undefined,
      condicoesPagamento: proposta.condicoesPagamento || undefined,
      prazoEntrega: proposta.prazoEntrega || undefined,
      tipoPedido: proposta.tipoPedido || undefined,
      transportadora: proposta.transportadora || undefined,
      informacoesAdicionais: proposta.informacoesAdicionais || undefined,
      estrategiaRepresentacao: proposta.estrategiaRepresentacao || undefined,
      publicoAlvo: proposta.publicoAlvo || undefined,
      diferenciaisCompetitivos: proposta.diferenciaisCompetitivos || undefined,
      clienteCnpj: proposta.clienteCnpj || undefined,
      clienteEndereco: proposta.clienteEndereco || undefined,
      clienteNumero: proposta.clienteNumero || undefined,
      clienteBairro: proposta.clienteBairro || undefined,
      clienteCidade: proposta.clienteCidade || undefined,
      clienteCep: proposta.clienteCep || undefined,
      clienteEstado: proposta.clienteEstado || undefined,
      clienteTelefone: proposta.clienteTelefone || undefined,
      clienteEmail: proposta.clienteEmail || undefined,
      clienteNomeFantasia: proposta.clienteNomeFantasia || undefined,
      quantidadeAdquirida: proposta.quantidadeAdquirida || undefined,
      valorCompra: proposta.valorCompra || undefined,
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

