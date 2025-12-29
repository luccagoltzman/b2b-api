import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migração de checkpoints para dados existentes...');

  // Migrar checkpoints para propostas existentes
  const propostas = await prisma.proposta.findMany({
    where: {
      checkpoints: {
        none: {},
      },
    },
  });

  console.log(`📋 Encontradas ${propostas.length} propostas sem checkpoints`);

  for (const proposta of propostas) {
    await prisma.checkpoint.create({
      data: {
        propostaId: proposta.id,
        status: proposta.status,
        label: getPropostaLabel(proposta.status),
        descricao: 'Checkpoint inicial criado na migração',
        usuario: 'sistema',
        data: proposta.dataCriacao,
      },
    });
  }

  console.log(`✅ ${propostas.length} checkpoints de propostas criados`);

  // Migrar checkpoints para visitas existentes
  const visitas = await prisma.visita.findMany({
    where: {
      checkpoints: {
        none: {},
      },
    },
  });

  console.log(`📅 Encontradas ${visitas.length} visitas sem checkpoints`);

  for (const visita of visitas) {
    await prisma.checkpoint.create({
      data: {
        visitaId: visita.id,
        status: visita.status,
        label: getVisitaLabel(visita.status),
        descricao: 'Checkpoint inicial criado na migração',
        usuario: 'sistema',
        data: visita.createdAt,
      },
    });
  }

  console.log(`✅ ${visitas.length} checkpoints de visitas criados`);
  console.log('🎉 Migração concluída com sucesso!');
}

function getPropostaLabel(status: string): string {
  const labels: Record<string, string> = {
    rascunho: 'Rascunho',
    pendente: 'Pendente',
    enviada: 'Enviada',
    em_analise_gerente_compras: 'Em Análise - Gerente de Compras',
    em_analise_diretoria: 'Em Análise - Diretoria',
    aprovada: 'Aprovada',
    rejeitada: 'Rejeitada',
    cancelada: 'Cancelada',
  };
  return labels[status] || status;
}

function getVisitaLabel(status: string): string {
  const labels: Record<string, string> = {
    agendada: 'Agendada',
    confirmada: 'Confirmada',
    em_andamento: 'Em Andamento',
    realizada: 'Realizada',
    cancelada: 'Cancelada',
    reagendada: 'Reagendada',
  };
  return labels[status] || status;
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

