import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populando templates de etapas iniciais...');

  const initialSteps = [
    { name: 'CUTTING',   label: 'Corte',          order: 1, mins: 60 },
    { name: 'MOLDING',   label: 'Molde / Forno',  order: 2, mins: 120 },
    { name: 'PAINTING',  label: 'Pintura',        order: 3, mins: 90 },
    { name: 'FINISHING', label: 'Acabamento',     order: 4, mins: 45 },
    { name: 'GLOSS',     label: 'Brilho',         order: 5, mins: 30 },
    { name: 'CLEANING',  label: 'Limpeza',        order: 6, mins: 30 },
    { name: 'PACKAGING', label: 'Embalagem',      order: 7, mins: 30 },
  ];

  for (const step of initialSteps) {
    await prisma.productionStepTemplate.upsert({
      where: { name: step.name },
      update: {},
      create: {
        name: step.name,
        stepOrder: step.order,
        estimatedMinutes: step.mins,
        isActive: true,
      },
    });
  }

  console.log('✅ Templates criados com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
