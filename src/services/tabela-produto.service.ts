import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { PropostaService } from './proposta.service';

export interface TabelaProdutoItemInput {
  produto: string;
  produtoCodigo?: string;
  marca: string;
  categoria?: string;
  unidadeMedida: string;
  quantidade: number;
  valorUnitario: number;
  aliquotaIpi?: number;
  desconto?: number;
  descontoTipo?: 'percentual' | 'valor';
}

export interface TabelaProdutoInput {
  nome: string;
  clientes: string[];
  produtos: TabelaProdutoItemInput[];
  condicoesPagamento?: string;
  prazoEntrega?: string;
  observacoes?: string;
  dataVencimento: string;
  representanteId?: string;
}

export interface TabelaProdutoResponse {
  id: string;
  nome: string;
  cliente?: string; // Para compatibilidade
  clientes: string[];
  produtos: Array<{
    id: string;
    produto: string;
    produtoCodigo?: string;
    marca: string;
    categoria?: string;
    unidadeMedida: string;
    quantidade: number;
    valorUnitario: number;
    aliquotaIpi?: number;
    desconto?: number;
    descontoTipo?: 'percentual' | 'valor';
  }>;
  condicoesPagamento?: string;
  prazoEntrega?: string;
  observacoes?: string;
  dataCriacao: string;
  dataVencimento: string;
  status: 'rascunho' | 'enviada' | 'aguardando_resposta' | 'proposta_gerada';
}

export class TabelaProdutoService {
  private propostaService: PropostaService;

  constructor() {
    this.propostaService = new PropostaService();
  }

  /**
   * Lista todas as tabelas de produtos
   */
  async listar(representanteId?: string): Promise<TabelaProdutoResponse[]> {
    const where: any = {};
    if (representanteId) {
      where.representanteId = representanteId;
    }

    const tabelas = await prisma.tabelaProduto.findMany({
      where,
      include: {
        clientes: true,
        produtos: {
          orderBy: { ordem: 'asc' },
        },
      },
      orderBy: { dataCriacao: 'desc' },
    });

    return tabelas.map(this.mapToResponse);
  }

  /**
   * Busca uma tabela por ID
   */
  async buscarPorId(id: string): Promise<TabelaProdutoResponse | null> {
    const tabela = await prisma.tabelaProduto.findUnique({
      where: { id },
      include: {
        clientes: true,
        produtos: {
          orderBy: { ordem: 'asc' },
        },
      },
    });

    if (!tabela) return null;

    return this.mapToResponse(tabela);
  }

  /**
   * Cria uma nova tabela de produtos
   */
  async criar(dados: TabelaProdutoInput): Promise<TabelaProdutoResponse> {
    // Validações
    if (!dados.nome || dados.nome.trim().length === 0) {
      throw new AppError('Nome da tabela é obrigatório', 'VALIDATION_ERROR', 400);
    }

    if (!dados.clientes || dados.clientes.length === 0) {
      throw new AppError('A tabela deve ter pelo menos um cliente', 'VALIDATION_ERROR', 400);
    }

    if (!dados.produtos || dados.produtos.length === 0) {
      throw new AppError('A tabela deve ter pelo menos um produto', 'VALIDATION_ERROR', 400);
    }

    // Validar data de vencimento
    const dataVencimento = new Date(dados.dataVencimento);
    if (isNaN(dataVencimento.getTime())) {
      throw new AppError('Data de vencimento inválida', 'VALIDATION_ERROR', 400);
    }

    if (dataVencimento <= new Date()) {
      throw new AppError('Data de vencimento deve ser futura', 'VALIDATION_ERROR', 400);
    }

    // Validar produtos
    for (let i = 0; i < dados.produtos.length; i++) {
      const produto = dados.produtos[i];
      if (!produto.produto || produto.produto.trim().length === 0) {
        throw new AppError(`Produto ${i + 1}: nome do produto é obrigatório`, 'VALIDATION_ERROR', 400);
      }
      if (!produto.marca || produto.marca.trim().length === 0) {
        throw new AppError(`Produto ${i + 1}: marca é obrigatória`, 'VALIDATION_ERROR', 400);
      }
      if (!produto.unidadeMedida || produto.unidadeMedida.trim().length === 0) {
        throw new AppError(`Produto ${i + 1}: unidade de medida é obrigatória`, 'VALIDATION_ERROR', 400);
      }
      if (produto.quantidade <= 0) {
        throw new AppError(`Produto ${i + 1}: quantidade deve ser maior que zero`, 'VALIDATION_ERROR', 400);
      }
      if (produto.valorUnitario <= 0) {
        throw new AppError(`Produto ${i + 1}: valor unitário deve ser maior que zero`, 'VALIDATION_ERROR', 400);
      }
      if (produto.desconto !== undefined && produto.desconto < 0) {
        throw new AppError(`Produto ${i + 1}: desconto não pode ser negativo`, 'VALIDATION_ERROR', 400);
      }
      if (produto.aliquotaIpi !== undefined && (produto.aliquotaIpi < 0 || produto.aliquotaIpi > 100)) {
        throw new AppError(`Produto ${i + 1}: alíquota IPI deve estar entre 0 e 100`, 'VALIDATION_ERROR', 400);
      }
    }

    // Criar tabela com produtos e clientes
    const tabela = await prisma.tabelaProduto.create({
      data: {
        nome: dados.nome.trim(),
        representanteId: dados.representanteId || null,
        status: 'rascunho',
        condicoesPagamento: dados.condicoesPagamento,
        prazoEntrega: dados.prazoEntrega,
        observacoes: dados.observacoes,
        dataVencimento: dataVencimento,
        clientes: {
          create: dados.clientes.map((clienteNome) => ({
            clienteNome: clienteNome.trim(),
            statusEnvio: 'pendente',
          })),
        },
        produtos: {
          create: dados.produtos.map((produto, index) => ({
            produto: produto.produto.trim(),
            produtoCodigo: produto.produtoCodigo,
            marca: produto.marca.trim(),
            categoria: produto.categoria,
            unidadeMedida: produto.unidadeMedida.trim(),
            quantidade: produto.quantidade,
            valorUnitario: produto.valorUnitario,
            aliquotaIpi: produto.aliquotaIpi || 0,
            desconto: produto.desconto || 0,
            descontoTipo: produto.descontoTipo || 'percentual',
            ordem: index + 1,
          })),
        },
      },
      include: {
        clientes: true,
        produtos: {
          orderBy: { ordem: 'asc' },
        },
      },
    });

    return this.mapToResponse(tabela);
  }

  /**
   * Atualiza uma tabela existente
   */
  async atualizar(id: string, dados: Partial<TabelaProdutoInput>): Promise<TabelaProdutoResponse> {
    const tabelaExistente = await prisma.tabelaProduto.findUnique({
      where: { id },
    });

    if (!tabelaExistente) {
      throw new AppError('Tabela não encontrada', 'NOT_FOUND', 404);
    }

    // Validar data de vencimento se fornecida
    let dataVencimento = tabelaExistente.dataVencimento;
    if (dados.dataVencimento) {
      const novaData = new Date(dados.dataVencimento);
      if (isNaN(novaData.getTime())) {
        throw new AppError('Data de vencimento inválida', 'VALIDATION_ERROR', 400);
      }
      if (novaData <= new Date()) {
        throw new AppError('Data de vencimento deve ser futura', 'VALIDATION_ERROR', 400);
      }
      dataVencimento = novaData;
    }

    // Validar produtos se fornecidos
    if (dados.produtos) {
      for (let i = 0; i < dados.produtos.length; i++) {
        const produto = dados.produtos[i];
        if (!produto.produto || produto.produto.trim().length === 0) {
          throw new AppError(`Produto ${i + 1}: nome do produto é obrigatório`, 'VALIDATION_ERROR', 400);
        }
        if (!produto.marca || produto.marca.trim().length === 0) {
          throw new AppError(`Produto ${i + 1}: marca é obrigatória`, 'VALIDATION_ERROR', 400);
        }
        if (produto.quantidade <= 0) {
          throw new AppError(`Produto ${i + 1}: quantidade deve ser maior que zero`, 'VALIDATION_ERROR', 400);
        }
        if (produto.valorUnitario <= 0) {
          throw new AppError(`Produto ${i + 1}: valor unitário deve ser maior que zero`, 'VALIDATION_ERROR', 400);
        }
      }
    }

    // Atualizar tabela
    const tabela = await prisma.tabelaProduto.update({
      where: { id },
      data: {
        ...(dados.nome && { nome: dados.nome.trim() }),
        ...(dados.condicoesPagamento !== undefined && { condicoesPagamento: dados.condicoesPagamento }),
        ...(dados.prazoEntrega !== undefined && { prazoEntrega: dados.prazoEntrega }),
        ...(dados.observacoes !== undefined && { observacoes: dados.observacoes }),
        ...(dados.dataVencimento && { dataVencimento }),
      },
      include: {
        clientes: true,
        produtos: {
          orderBy: { ordem: 'asc' },
        },
      },
    });

    // Atualizar clientes se fornecidos
    if (dados.clientes) {
      // Deletar clientes existentes
      await prisma.tabelaCliente.deleteMany({
        where: { tabelaId: id },
      });

      // Criar novos clientes
      await prisma.tabelaCliente.createMany({
        data: dados.clientes.map((clienteNome) => ({
          tabelaId: id,
          clienteNome: clienteNome.trim(),
          statusEnvio: 'pendente',
        })),
      });
    }

    // Atualizar produtos se fornecidos
    if (dados.produtos) {
      // Deletar produtos existentes
      await prisma.tabelaProdutoItem.deleteMany({
        where: { tabelaId: id },
      });

      // Criar novos produtos
      await prisma.tabelaProdutoItem.createMany({
        data: dados.produtos.map((produto, index) => ({
          tabelaId: id,
          produto: produto.produto.trim(),
          produtoCodigo: produto.produtoCodigo,
          marca: produto.marca.trim(),
          categoria: produto.categoria,
          unidadeMedida: produto.unidadeMedida.trim(),
          quantidade: produto.quantidade,
          valorUnitario: produto.valorUnitario,
          aliquotaIpi: produto.aliquotaIpi || 0,
          desconto: produto.desconto || 0,
          descontoTipo: produto.descontoTipo || 'percentual',
          ordem: index + 1,
        })),
      });
    }

    // Buscar tabela atualizada
    const tabelaAtualizada = await prisma.tabelaProduto.findUnique({
      where: { id },
      include: {
        clientes: true,
        produtos: {
          orderBy: { ordem: 'asc' },
        },
      },
    });

    return this.mapToResponse(tabelaAtualizada!);
  }

  /**
   * Deleta uma tabela
   */
  async deletar(id: string): Promise<void> {
    const tabela = await prisma.tabelaProduto.findUnique({
      where: { id },
    });

    if (!tabela) {
      throw new AppError('Tabela não encontrada', 'NOT_FOUND', 404);
    }

    await prisma.tabelaProduto.delete({
      where: { id },
    });
  }

  /**
   * Marca a tabela como enviada
   */
  async enviar(id: string, clientesEnviados?: string[]): Promise<TabelaProdutoResponse> {
    const tabela = await prisma.tabelaProduto.findUnique({
      where: { id },
      include: {
        clientes: true,
      },
    });

    if (!tabela) {
      throw new AppError('Tabela não encontrada', 'NOT_FOUND', 404);
    }

    // Se clientes específicos foram fornecidos, atualizar apenas esses
    if (clientesEnviados && clientesEnviados.length > 0) {
      await prisma.tabelaCliente.updateMany({
        where: {
          tabelaId: id,
          clienteNome: {
            in: clientesEnviados,
          },
        },
        data: {
          statusEnvio: 'enviada',
        },
      });

      // Verificar se todos os clientes foram enviados
      const clientesAtualizados = await prisma.tabelaCliente.findMany({
        where: { tabelaId: id },
      });

      const todosEnviados = clientesAtualizados.every((c) => c.statusEnvio === 'enviada');
      if (todosEnviados) {
        await prisma.tabelaProduto.update({
          where: { id },
          data: { status: 'enviada' },
        });
      } else {
        // Se pelo menos um foi enviado, mudar para aguardando_resposta
        await prisma.tabelaProduto.update({
          where: { id },
          data: { status: 'aguardando_resposta' },
        });
      }
    } else {
      // Marcar todos os clientes como enviados
      await prisma.tabelaCliente.updateMany({
        where: { tabelaId: id },
        data: { statusEnvio: 'enviada' },
      });

      // Atualizar status da tabela
      await prisma.tabelaProduto.update({
        where: { id },
        data: { status: 'enviada' },
      });
    }

    const tabelaAtualizada = await prisma.tabelaProduto.findUnique({
      where: { id },
      include: {
        clientes: true,
        produtos: {
          orderBy: { ordem: 'asc' },
        },
      },
    });

    return this.mapToResponse(tabelaAtualizada!);
  }

  /**
   * Gera uma proposta definitiva baseada na seleção do cliente
   */
  async gerarProposta(
    tabelaId: string,
    cliente: string,
    selecoes: Array<{ produtoId: string }>
  ): Promise<any> {
    // Buscar tabela com produtos
    const tabela = await prisma.tabelaProduto.findUnique({
      where: { id: tabelaId },
      include: {
        produtos: {
          orderBy: { ordem: 'asc' },
        },
        clientes: true,
      },
    });

    if (!tabela) {
      throw new AppError('Tabela não encontrada', 'NOT_FOUND', 404);
    }

    // Verificar se o cliente está na lista de clientes da tabela
    const clienteEncontrado = tabela.clientes.find((c) => c.clienteNome === cliente);
    if (!clienteEncontrado) {
      throw new AppError('Cliente não encontrado nesta tabela', 'VALIDATION_ERROR', 400);
    }

    if (selecoes.length === 0) {
      throw new AppError('Selecione pelo menos um produto', 'VALIDATION_ERROR', 400);
    }

    // Buscar produtos selecionados
    const produtosSelecionados = tabela.produtos.filter((p) =>
      selecoes.some((s) => s.produtoId === p.id)
    );

    if (produtosSelecionados.length === 0) {
      throw new AppError('Nenhum produto válido foi selecionado', 'VALIDATION_ERROR', 400);
    }

    // Calcular valores para cada produto
    const produtosCalculados = produtosSelecionados.map((produto) => {
      // 1. Valor unitário base
      let valorComIPI = produto.valorUnitario;

      // 2. Aplicar IPI (se houver)
      if (produto.aliquotaIpi && produto.aliquotaIpi > 0) {
        valorComIPI = valorComIPI * (1 + produto.aliquotaIpi / 100);
      }

      // 3. Aplicar desconto interno (se houver)
      let valorComDesconto = valorComIPI;
      if (produto.desconto && produto.desconto > 0) {
        if (produto.descontoTipo === 'percentual') {
          valorComDesconto = valorComIPI * (1 - produto.desconto / 100);
        } else {
          valorComDesconto = Math.max(0, valorComIPI - produto.desconto);
        }
      }

      // 4. Calcular valor total do produto
      const valorTotal = valorComDesconto * produto.quantidade;

      return {
        produto: produto.produto,
        produtoCodigo: produto.produtoCodigo,
        marca: produto.marca,
        categoria: produto.categoria,
        unidadeMedida: produto.unidadeMedida,
        valorUnitario: valorComDesconto, // Valor unitário após IPI e desconto
        quantidade: produto.quantidade,
        aliquotaIpi: produto.aliquotaIpi || 0,
        desconto: produto.desconto || 0,
        descontoTipo: produto.descontoTipo || 'percentual',
        valorTotal,
      };
    });

    // Calcular valor total da proposta
    const valorTotal = produtosCalculados.reduce((sum, p) => sum + p.valorTotal, 0);

    // Criar proposta usando o PropostaService
    // Como a proposta pode ter múltiplos produtos, vamos usar o primeiro produto como base
    // e adicionar os outros no campo descricao/observacoes de forma estruturada
    const primeiroProduto = produtosCalculados[0];

    // Formatar descrição com todos os produtos
    const descricaoProdutos = produtosCalculados
      .map((p, index) => {
        const num = index + 1;
        return `${num}. ${p.produto} (${p.marca})\n   Quantidade: ${p.quantidade} ${p.unidadeMedida}\n   Valor Unitário: R$ ${p.valorUnitario.toFixed(2)}\n   Valor Total: R$ ${p.valorTotal.toFixed(2)}`;
      })
      .join('\n\n');

    const descricao = `Proposta gerada automaticamente a partir da tabela "${tabela.nome}"\n\nPRODUTOS SELECIONADOS:\n\n${descricaoProdutos}\n\nVALOR TOTAL DA PROPOSTA: R$ ${valorTotal.toFixed(2)}`;

    // Formatar observações
    let observacoes = '';
    if (tabela.observacoes) {
      observacoes += tabela.observacoes;
    }
    if (produtosCalculados.length > 1) {
      if (observacoes) observacoes += '\n\n';
      observacoes += 'NOTA: Esta proposta contém múltiplos produtos. Os valores já incluem IPI e descontos aplicados.';
    }

    const proposta = await this.propostaService.criar({
      cliente,
      valor: valorTotal,
      status: 'pendente',
      dataVencimento: tabela.dataVencimento.toISOString().split('T')[0],
      descricao,
      produto: primeiroProduto.produto,
      produtoCodigo: primeiroProduto.produtoCodigo,
      marca: primeiroProduto.marca,
      categoria: primeiroProduto.categoria,
      unidadeMedida: primeiroProduto.unidadeMedida,
      valorUnitario: primeiroProduto.valorUnitario,
      quantidade: primeiroProduto.quantidade,
      aliquotaIpi: primeiroProduto.aliquotaIpi,
      desconto: primeiroProduto.desconto,
      descontoTipo: primeiroProduto.descontoTipo,
      condicoesPagamento: tabela.condicoesPagamento || undefined,
      prazoEntrega: tabela.prazoEntrega || undefined,
      observacoes: observacoes || undefined,
    });

    // Atualizar proposta com tabelaId e geradaAutomaticamente
    await prisma.proposta.update({
      where: { id: proposta.id },
      data: {
        tabelaId: tabelaId,
        geradaAutomaticamente: true,
      },
    });

    // Atualizar status do cliente na tabela
    await prisma.tabelaCliente.update({
      where: { id: clienteEncontrado.id },
      data: { statusEnvio: 'respondida' },
    });

    // Verificar se todos os clientes responderam
    const clientesAtualizados = await prisma.tabelaCliente.findMany({
      where: { tabelaId },
    });

    const todosResponderam = clientesAtualizados.every((c) => c.statusEnvio === 'respondida');
    if (todosResponderam) {
      await prisma.tabelaProduto.update({
        where: { id: tabelaId },
        data: { status: 'proposta_gerada' },
      });
    } else {
      // Se pelo menos um respondeu, manter como aguardando_resposta
      await prisma.tabelaProduto.update({
        where: { id: tabelaId },
        data: { status: 'aguardando_resposta' },
      });
    }

    // Retornar proposta com todos os produtos calculados
    return {
      proposta: {
        ...proposta,
        produtos: produtosCalculados,
      },
    };
  }

  /**
   * Mapeia o modelo do Prisma para a resposta da API
   */
  private mapToResponse(tabela: any): TabelaProdutoResponse {
    const clientes = tabela.clientes.map((c: any) => c.clienteNome);
    return {
      id: tabela.id,
      nome: tabela.nome,
      cliente: clientes[0], // Para compatibilidade
      clientes,
      produtos: tabela.produtos.map((p: any) => ({
        id: p.id,
        produto: p.produto,
        produtoCodigo: p.produtoCodigo,
        marca: p.marca,
        categoria: p.categoria,
        unidadeMedida: p.unidadeMedida,
        quantidade: p.quantidade,
        valorUnitario: p.valorUnitario,
        aliquotaIpi: p.aliquotaIpi,
        desconto: p.desconto,
        descontoTipo: p.descontoTipo,
      })),
      condicoesPagamento: tabela.condicoesPagamento || undefined,
      prazoEntrega: tabela.prazoEntrega || undefined,
      observacoes: tabela.observacoes || undefined,
      dataCriacao: tabela.dataCriacao.toISOString(),
      dataVencimento: tabela.dataVencimento.toISOString(),
      status: tabela.status as 'rascunho' | 'enviada' | 'aguardando_resposta' | 'proposta_gerada',
    };
  }
}
