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
  clientes: Array<string | { nome: string; email?: string; telefone?: string }>;
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
          create: dados.clientes.map((cliente) => {
            if (typeof cliente === 'string') {
              return {
                clienteNome: cliente.trim(),
                statusEnvio: 'pendente',
              };
            } else {
              return {
                clienteNome: cliente.nome.trim(),
                clienteEmail: cliente.email,
                clienteTelefone: cliente.telefone,
                statusEnvio: 'pendente',
              };
            }
          }),
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
        data: dados.clientes.map((cliente) => {
          if (typeof cliente === 'string') {
            return {
              tabelaId: id,
              clienteNome: cliente.trim(),
              statusEnvio: 'pendente',
            };
          } else {
            return {
              tabelaId: id,
              clienteNome: cliente.nome.trim(),
              clienteEmail: cliente.email,
              clienteTelefone: cliente.telefone,
              statusEnvio: 'pendente',
            };
          }
        }),
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
   * Marca a tabela como enviada e cria registros de envio
   */
  async enviar(
    id: string,
    clientesEnviados?: string[],
    metodo?: 'email' | 'whatsapp' | 'manual',
    configuracao?: {
      email?: { assunto?: string; corpo?: string };
      whatsapp?: { mensagem?: string };
      arquivoPdfUrl?: string;
      arquivoExcelUrl?: string;
    }
  ): Promise<{ message: string; tabela: TabelaProdutoResponse; envios: any[] }> {
    const tabela = await prisma.tabelaProduto.findUnique({
      where: { id },
      include: {
        clientes: true,
      },
    });

    if (!tabela) {
      throw new AppError('Tabela não encontrada', 'NOT_FOUND', 404);
    }

    const metodoEnvio = metodo || 'manual';
    const clientesParaEnviar = clientesEnviados || tabela.clientes.map((c) => c.clienteNome);
    const enviosCriados: any[] = [];

    // Atualizar status dos clientes e criar registros de envio
    for (const clienteNome of clientesParaEnviar) {
      const cliente = tabela.clientes.find((c) => c.clienteNome === clienteNome);
      if (!cliente) continue;

      const clienteCompleto = cliente as any; // Type assertion para campos opcionais
      const destinatario = metodoEnvio === 'email' ? clienteCompleto.clienteEmail : clienteCompleto.clienteTelefone || cliente.clienteNome;

      // Tentar criar registro de envio (pode falhar se a tabela não existir)
      // Verificar se a tabela existe no Prisma Client antes de usar
      const prismaClient = prisma as any;
      if (prismaClient.tabelaEnvio && typeof prismaClient.tabelaEnvio.create === 'function') {
        try {
          const envio = await prismaClient.tabelaEnvio.create({
            data: {
              tabelaId: id,
              clienteNome: clienteNome,
              metodoEnvio: metodoEnvio,
              destinatario: destinatario || clienteNome,
              status: metodoEnvio === 'manual' ? 'enviado' : 'pendente',
              arquivoPdfUrl: configuracao?.arquivoPdfUrl,
              arquivoExcelUrl: configuracao?.arquivoExcelUrl,
              dataEnvio: new Date(),
            },
          });

          enviosCriados.push({
            id: envio.id,
            cliente: clienteNome,
            metodo: metodoEnvio,
            status: envio.status,
            data_envio: envio.dataEnvio?.toISOString(),
          });
        } catch (error: any) {
          // Se falhar, criar registro mock
          console.warn('Não foi possível criar registro de envio:', error.message);
          enviosCriados.push({
            id: null,
            cliente: clienteNome,
            metodo: metodoEnvio,
            status: metodoEnvio === 'manual' ? 'enviado' : 'pendente',
            data_envio: new Date().toISOString(),
          });
        }
      } else {
        // Se a tabela não existe no Prisma Client, criar registro mock
        console.warn('Tabela de envios não encontrada no Prisma Client. Execute: npm run prisma:generate && npm run prisma:migrate');
        enviosCriados.push({
          id: null,
          cliente: clienteNome,
          metodo: metodoEnvio,
          status: metodoEnvio === 'manual' ? 'enviado' : 'pendente',
          data_envio: new Date().toISOString(),
        });
      }

      // Atualizar status do cliente
      // Tentar atualizar com campos opcionais, mas não falhar se não existirem
      try {
        const updateData: any = {
          statusEnvio: 'enviada',
        };
        
        // Tentar adicionar campos opcionais se o schema suportar
        try {
          updateData.dataEnvio = new Date();
          updateData.metodoEnvio = metodoEnvio;
        } catch (e) {
          // Ignorar se campos não existirem
        }
        
        await prisma.tabelaCliente.update({
          where: { id: cliente.id },
          data: updateData,
        });
      } catch (error: any) {
        // Se falhar por causa de campos inexistentes, tentar apenas com statusEnvio
        if (error.message?.includes('Unknown argument') || error.message?.includes('does not exist')) {
          await prisma.tabelaCliente.update({
            where: { id: cliente.id },
            data: {
              statusEnvio: 'enviada',
            },
          });
        } else {
          throw error;
        }
      }
    }

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

    const tabelaAtualizada = await prisma.tabelaProduto.findUnique({
      where: { id },
      include: {
        clientes: true,
        produtos: {
          orderBy: { ordem: 'asc' },
        },
      },
    });

    return {
      message: 'Tabela enviada com sucesso',
      tabela: this.mapToResponse(tabelaAtualizada!),
      envios: enviosCriados,
    };
  }

  /**
   * Gera uma proposta definitiva baseada na seleção do cliente (Simular Retorno)
   */
  async gerarProposta(
    tabelaId: string,
    cliente: string,
    selecoes: Array<{ produtoId: string; quantidade?: number; selecionado?: boolean }>
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

    // Cliente pode não estar na tabela (ex.: Simular Retorno com nome livre)
    const clienteEncontrado = tabela.clientes.find((c) => c.clienteNome === cliente);

    // Considerar apenas itens selecionados (selecionado !== false)
    const selecoesAtivas = selecoes.filter((s) => s.selecionado !== false);
    if (selecoesAtivas.length === 0) {
      throw new AppError('Selecione pelo menos um produto', 'VALIDATION_ERROR', 400);
    }

    // Buscar produtos selecionados e obter quantidade da seleção quando fornecida
    const produtosSelecionados = tabela.produtos.filter((p) =>
      selecoesAtivas.some((s) => s.produtoId === p.id)
    );

    if (produtosSelecionados.length === 0) {
      throw new AppError('Nenhum produto válido foi selecionado', 'VALIDATION_ERROR', 400);
    }

    const getQuantidade = (produtoId: string): number => {
      const sel = selecoesAtivas.find((s) => s.produtoId === produtoId);
      if (sel?.quantidade != null && sel.quantidade > 0) return sel.quantidade;
      const prod = tabela.produtos.find((p) => p.id === produtoId);
      return prod?.quantidade ?? 1;
    };

    // Calcular valores para cada produto (usando quantidade da seleção quando fornecida)
    const produtosCalculados = produtosSelecionados.map((produto) => {
      const quantidade = getQuantidade(produto.id);
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
      const valorTotal = valorComDesconto * quantidade;

      return {
        produto: produto.produto,
        produtoCodigo: produto.produtoCodigo,
        marca: produto.marca,
        categoria: produto.categoria,
        unidadeMedida: produto.unidadeMedida,
        valorUnitario: valorComDesconto,
        quantidade,
        aliquotaIpi: produto.aliquotaIpi || 0,
        desconto: produto.desconto || 0,
        descontoTipo: produto.descontoTipo || 'percentual',
        valorTotal,
      };
    });

    // Calcular valor total da proposta
    const valorTotal = produtosCalculados.reduce((sum, p) => sum + p.valorTotal, 0);

    // Criar Nota de Retorno (valores sem descontos aplicados - como aparecem na tabela)
    // Tentar criar, mas continuar mesmo se a tabela não existir (migração não executada)
    let notaRetorno: any = null;
    try {
      notaRetorno = await (prisma as any).notaRetorno.create({
        data: {
          tabelaId: tabelaId,
          clienteNome: cliente,
          dataGeracao: new Date(),
          produtos: {
            create: produtosSelecionados.map((produto) => ({
              produtoId: produto.id,
              produtoNome: produto.produto,
              quantidade: produto.quantidade,
              valorUnitario: produto.valorUnitario, // Valor sem desconto (como na tabela)
              valorTotal: produto.valorUnitario * produto.quantidade, // Valor sem desconto
            })),
          },
        },
        include: {
          produtos: true,
        },
      });
    } catch (error: any) {
      // Se a tabela não existir, apenas logar e continuar sem criar nota de retorno
      if (error.code === 'P2021' || error.message?.includes('Table') || error.message?.includes('does not exist')) {
        console.warn('Tabela de notas de retorno não encontrada. Execute a migração: npm run prisma:migrate');
        // Criar objeto mock para não quebrar a resposta
        notaRetorno = {
          id: null,
          produtos: produtosSelecionados.map((produto) => ({
            produtoId: produto.id,
            produtoNome: produto.produto,
            quantidade: produto.quantidade,
            valorUnitario: produto.valorUnitario,
            valorTotal: produto.valorUnitario * produto.quantidade,
          })),
          dataGeracao: new Date(),
        };
      } else {
        throw error;
      }
    }

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
      produtoCodigo: primeiroProduto.produtoCodigo || undefined,
      marca: primeiroProduto.marca,
      categoria: primeiroProduto.categoria || undefined,
      unidadeMedida: primeiroProduto.unidadeMedida,
      valorUnitario: primeiroProduto.valorUnitario,
      quantidade: primeiroProduto.quantidade,
      aliquotaIpi: primeiroProduto.aliquotaIpi,
      desconto: primeiroProduto.desconto,
      descontoTipo: (primeiroProduto.descontoTipo as 'percentual' | 'valor') || 'percentual',
      condicoesPagamento: tabela.condicoesPagamento || undefined,
      prazoEntrega: tabela.prazoEntrega || undefined,
      observacoes: observacoes || undefined,
    });

    // Atualizar proposta com tabelaId, geradaAutomaticamente e notaRetornoId
    await prisma.proposta.update({
      where: { id: proposta.id },
      data: {
        tabelaId: tabelaId,
        geradaAutomaticamente: true,
        ...(notaRetorno?.id && { notaRetornoId: notaRetorno.id }),
      },
    });

    // Atualizar nota de retorno com propostaId (se foi criada)
    if (notaRetorno?.id) {
      try {
        await (prisma as any).notaRetorno.update({
          where: { id: notaRetorno.id },
          data: {
            propostaId: proposta.id,
          },
        });
      } catch (error: any) {
        // Se falhar, apenas logar (tabela pode não existir)
        console.warn('Não foi possível atualizar nota de retorno:', error.message);
      }
    }

    // Atualizar status do cliente na tabela (apenas se estiver na tabela)
    if (clienteEncontrado) {
      await prisma.tabelaCliente.update({
        where: { id: clienteEncontrado.id },
        data: { statusEnvio: 'respondida' },
      });
    }

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
      await prisma.tabelaProduto.update({
        where: { id: tabelaId },
        data: { status: 'aguardando_resposta' },
      });
    }

    // Retornar o objeto da proposta criada (contrato do frontend)
    const propostaRetorno = await this.propostaService.buscarPorId(proposta.id);
    return propostaRetorno!;
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
