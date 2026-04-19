import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Convertendo colunas de Enum para Texto manualmente...');

  try {
    // Converter production_steps
    await prisma.$executeRawUnsafe(`
      ALTER TABLE production_steps 
      ALTER COLUMN "stepName" TYPE TEXT USING "stepName"::TEXT;
    `);
    console.log('✅ Coluna production_steps.stepName convertida.');

    // Converter step_configs
    await prisma.$executeRawUnsafe(`
      ALTER TABLE step_configs 
      ALTER COLUMN "stepName" TYPE TEXT USING "stepName"::TEXT;
    `);
    console.log('✅ Coluna step_configs.stepName convertida.');

  } catch (error) {
    console.error('❌ Erro ao converter colunas:', error);
  }
}

main().finally(() => prisma.$disconnect());
