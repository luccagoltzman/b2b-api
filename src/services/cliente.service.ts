import { prisma } from '../lib/prisma';
import { Cliente } from '../types';
import { AppError } from '../middleware/errorHandler';

export interface ClienteInput {
  nome: string;
  email?: string;
  telefone?: string;
  empresa?: string;
  cnpj?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  inscricaoEstadual?: string;
}

export class ClienteService {
  async listar(): Promise<Cliente[]> {
    const clientes = await prisma.cliente.findMany({
      orderBy: { nome: 'asc' },
    });
    return clientes.map(this.mapToCliente);
  }

  async buscarPorId(id: string): Promise<Cliente | null> {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
    });
    if (!cliente) return null;
    return this.mapToCliente(cliente);
  }

  async criar(dados: ClienteInput): Promise<Cliente> {
    const cliente = await prisma.cliente.create({
      data: {
        nome: dados.nome.trim(),
        email: dados.email?.trim() || null,
        telefone: dados.telefone?.trim() || null,
        empresa: dados.empresa?.trim() || null,
        cnpj: dados.cnpj?.trim() || null,
        endereco: dados.endereco?.trim() || null,
        numero: dados.numero?.trim() || null,
        bairro: dados.bairro?.trim() || null,
        cidade: dados.cidade?.trim() || null,
        estado: dados.estado?.trim() || null,
        cep: dados.cep?.trim() || null,
        inscricaoEstadual: dados.inscricaoEstadual?.trim() || null,
      },
    });
    return this.mapToCliente(cliente);
  }

  async atualizar(id: string, dados: Partial<ClienteInput>): Promise<Cliente> {
    const existente = await prisma.cliente.findUnique({ where: { id } });
    if (!existente) {
      throw new AppError('Cliente não encontrado', 'NOT_FOUND', 404);
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        ...(dados.nome !== undefined && { nome: dados.nome.trim() }),
        ...(dados.email !== undefined && { email: dados.email?.trim() || null }),
        ...(dados.telefone !== undefined && { telefone: dados.telefone?.trim() || null }),
        ...(dados.empresa !== undefined && { empresa: dados.empresa?.trim() || null }),
        ...(dados.cnpj !== undefined && { cnpj: dados.cnpj?.trim() || null }),
        ...(dados.endereco !== undefined && { endereco: dados.endereco?.trim() || null }),
        ...(dados.numero !== undefined && { numero: dados.numero?.trim() || null }),
        ...(dados.bairro !== undefined && { bairro: dados.bairro?.trim() || null }),
        ...(dados.cidade !== undefined && { cidade: dados.cidade?.trim() || null }),
        ...(dados.estado !== undefined && { estado: dados.estado?.trim() || null }),
        ...(dados.cep !== undefined && { cep: dados.cep?.trim() || null }),
        ...(dados.inscricaoEstadual !== undefined && {
          inscricaoEstadual: dados.inscricaoEstadual?.trim() || null,
        }),
      },
    });
    return this.mapToCliente(cliente);
  }

  async deletar(id: string): Promise<void> {
    const existente = await prisma.cliente.findUnique({ where: { id } });
    if (!existente) {
      throw new AppError('Cliente não encontrado', 'NOT_FOUND', 404);
    }
    await prisma.cliente.delete({ where: { id } });
  }

  private mapToCliente(row: {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    empresa: string | null;
    cnpj: string | null;
    endereco: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    inscricaoEstadual: string | null;
  }): Cliente {
    return {
      id: row.id,
      nome: row.nome,
      email: row.email ?? undefined,
      telefone: row.telefone ?? undefined,
      empresa: row.empresa ?? undefined,
      cnpj: row.cnpj ?? undefined,
      endereco: row.endereco ?? undefined,
      numero: row.numero ?? undefined,
      bairro: row.bairro ?? undefined,
      cidade: row.cidade ?? undefined,
      estado: row.estado ?? undefined,
      cep: row.cep ?? undefined,
      inscricaoEstadual: row.inscricaoEstadual ?? undefined,
    };
  }
}
