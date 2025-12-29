import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar propostas de exemplo
  const proposta1 = await prisma.proposta.create({
    data: {
      cliente: 'Supermercado ABC',
      valor: 50000.00,
      status: 'pendente',
      dataVencimento: new Date('2024-02-15'),
      descricao: 'Proposta de fornecimento de produtos alimentícios',
      observacoes: 'Aguardando aprovação do departamento de compras',
    },
  });

  const proposta2 = await prisma.proposta.create({
    data: {
      cliente: 'Rede Super XYZ',
      valor: 75000.00,
      status: 'aprovada',
      dataVencimento: new Date('2024-01-30'),
      descricao: 'Contrato anual de fornecimento',
      observacoes: 'Aprovada pelo gerente de compras',
    },
  });

  const proposta3 = await prisma.proposta.create({
    data: {
      cliente: 'Mercado Central',
      valor: 30000.00,
      status: 'enviada',
      dataVencimento: new Date('2024-02-20'),
      descricao: 'Proposta de produtos de limpeza',
    },
  });

  // Criar visitas de exemplo
  const visita1 = await prisma.visita.create({
    data: {
      cliente: 'Supermercado ABC',
      data: new Date('2024-01-20'),
      hora: '14:00',
      status: 'agendada',
      endereco: 'Rua das Flores, 123 - Centro',
      observacoes: 'Primeira visita ao cliente',
    },
  });

  const visita2 = await prisma.visita.create({
    data: {
      cliente: 'Rede Super XYZ',
      data: new Date('2024-01-15'),
      hora: '10:00',
      status: 'realizada',
      endereco: 'Av. Principal, 456 - Bairro Novo',
      observacoes: 'Visita realizada com sucesso. Cliente interessado na proposta.',
    },
  });

  const visita3 = await prisma.visita.create({
    data: {
      cliente: 'Mercado Central',
      data: new Date('2024-01-25'),
      hora: '16:00',
      status: 'agendada',
      endereco: 'Rua Comercial, 789',
    },
  });

  // Criar atividades de exemplo
  await prisma.atividade.create({
    data: {
      type: 'proposta',
      description: 'Nova proposta criada para Supermercado ABC',
      status: 'pendente',
    },
  });

  await prisma.atividade.create({
    data: {
      type: 'visita',
      description: 'Visita realizada para Rede Super XYZ',
      status: 'realizada',
    },
  });

  await prisma.atividade.create({
    data: {
      type: 'proposta',
      description: 'Proposta aprovada para Rede Super XYZ',
      status: 'aprovada',
    },
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log(`   - ${3} propostas criadas`);
  console.log(`   - ${3} visitas criadas`);
  console.log(`   - ${3} atividades criadas`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

