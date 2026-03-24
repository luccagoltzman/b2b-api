import { prisma } from '../lib/prisma';
import { Produto } from '../types';
import { AppError } from '../middleware/errorHandler';

export class ProdutoService {
  async listar(): Promise<Produto[]> {
    const produtos = await prisma.produto.findMany({
      orderBy: { produto: 'asc' },
    });

    return produtos.map(this.mapToProduto);
  }

  async buscarPorId(id: string): Promise<Produto | null> {
    const produto = await prisma.produto.findUnique({ where: { id } });
    if (!produto) return null;
    return this.mapToProduto(produto);
  }

  async criar(dados: {
    produto: string;
    produtoCodigo?: string;
    marca: string;
    categoria?: string;
    unidadeMedida: string;
    valorUnitario: number;
    aliquotaIpi?: number;
  }): Promise<Produto> {
    const produtoCriado = await prisma.produto.create({
      data: {
        produto: dados.produto,
        produtoCodigo: dados.produtoCodigo || null,
        marca: dados.marca,
        categoria: dados.categoria || null,
        unidadeMedida: dados.unidadeMedida,
        valorUnitario: dados.valorUnitario,
        aliquotaIpi: dados.aliquotaIpi ?? null,
      },
    });

    return this.mapToProduto(produtoCriado);
  }

  async atualizar(
    id: string,
    dados: Partial<{
      produto: string;
      produtoCodigo: string | null;
      marca: string;
      categoria: string | null;
      unidadeMedida: string;
      valorUnitario: number;
      aliquotaIpi: number | null;
      apresentacaoTipo: string | null;
      apresentacaoUrl: string | null;
      apresentacaoNome: string | null;
    }>
  ): Promise<Produto> {
    const produtoAtual = await prisma.produto.findUnique({ where: { id } });
    if (!produtoAtual) {
      throw new AppError('Produto não encontrado', 'NOT_FOUND', 404);
    }

    const produtoAtualizado = await prisma.produto.update({
      where: { id },
      data: {
        ...(dados.produto !== undefined && { produto: dados.produto }),
        ...(dados.produtoCodigo !== undefined && { produtoCodigo: dados.produtoCodigo }),
        ...(dados.marca !== undefined && { marca: dados.marca }),
        ...(dados.categoria !== undefined && { categoria: dados.categoria }),
        ...(dados.unidadeMedida !== undefined && { unidadeMedida: dados.unidadeMedida }),
        ...(dados.valorUnitario !== undefined && { valorUnitario: dados.valorUnitario }),
        ...(dados.aliquotaIpi !== undefined && { aliquotaIpi: dados.aliquotaIpi }),
        ...(dados.apresentacaoTipo !== undefined && {
          apresentacaoTipo: dados.apresentacaoTipo,
        }),
        ...(dados.apresentacaoUrl !== undefined && {
          apresentacaoUrl: dados.apresentacaoUrl,
        }),
        ...(dados.apresentacaoNome !== undefined && {
          apresentacaoNome: dados.apresentacaoNome,
        }),
      },
    });

    return this.mapToProduto(produtoAtualizado);
  }

  async deletar(id: string): Promise<void> {
    const produtoAtual = await prisma.produto.findUnique({ where: { id } });
    if (!produtoAtual) {
      throw new AppError('Produto não encontrado', 'NOT_FOUND', 404);
    }

    await prisma.produto.delete({ where: { id } });
  }

  private mapToProduto(row: any): Produto {
    return {
      id: row.id,
      produto: row.produto,
      produtoCodigo: row.produtoCodigo,
      marca: row.marca,
      categoria: row.categoria,
      unidadeMedida: row.unidadeMedida,
      valorUnitario: row.valorUnitario,
      aliquotaIpi: row.aliquotaIpi,
      apresentacaoTipo: row.apresentacaoTipo,
      apresentacaoUrl: row.apresentacaoUrl,
      apresentacaoNome: row.apresentacaoNome,
    };
  }
}

