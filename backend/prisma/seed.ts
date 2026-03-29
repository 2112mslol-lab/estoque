import { PrismaClient, StepName, UnitType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados (Supabase/PostgreSQL - Catálogo)...');

  // 1. Configurações padrão das etapas
  const stepConfigs = [
    { stepName: StepName.CUTTING,   estimatedMinutes: 60,  description: 'Corte do vidro' },
    { stepName: StepName.MOLDING,   estimatedMinutes: 120, description: 'Modelagem' },
    { stepName: StepName.COOLING,   estimatedMinutes: 180, description: 'Resfriamento' },
    { stepName: StepName.FINISHING, estimatedMinutes: 90,  description: 'Acabamento' },
    { stepName: StepName.PACKAGING, estimatedMinutes: 30,  description: 'Embalagem' },
  ];

  for (const config of stepConfigs) {
    await prisma.stepConfig.upsert({
      where: { stepName: config.stepName },
      update: { estimatedMinutes: config.estimatedMinutes, description: config.description },
      create: config,
    });
  }
  console.log('✅ Configurações de etapas criadas');

  // 2. CATÁLOGO DE PRODUTOS/MODELOS
  const catalogProducts = [
    { name: 'Vaso de Vidro Tulipa P', description: 'Vaso decorativo 20cm' },
    { name: 'Vaso de Vidro Tulipa M', description: 'Vaso decorativo 35cm' },
    { name: 'Prato de Vidro Jateado', description: 'Prato para mesa 30cm' },
    { name: 'Espelho Decorativo 50cm', description: 'Espelho redondo com moldura' },
    { name: 'Escultura Contemporânea', description: 'Peça artística sob medida' },
    { name: 'Fruteira de Vidro Wave', description: 'Fruteira artística ondulada' },
  ];

  for (const prod of catalogProducts) {
    await prisma.product.upsert({
      where: { name: prod.name },
      update: { description: prod.description },
      create: prod,
    });
  }
  console.log('✅ Catálogo de Produtos criado');

  // 3. Materiais de exemplo
  const materials = [
    { name: 'Vidro Float 4mm', unit: UnitType.SHEETS, currentStock: 50, minimumStock: 10, supplier: 'Vidroforte', costPerUnit: 45.00 },
    { name: 'Vidro Float 6mm', unit: UnitType.SHEETS, currentStock: 30, minimumStock: 8,  supplier: 'Vidroforte', costPerUnit: 70.00 },
  ];

  for (const mat of materials) {
    const exists = await prisma.material.findFirst({ where: { name: mat.name } });
    if (!exists) {
      await prisma.material.create({ data: mat });
    }
  }
  console.log('✅ Materiais criados');

  // 4. Clientes de exemplo
  const clients = [
    { name: 'Maria Fernanda Alves', email: 'maria@email.com', phone: '(11) 99999-1111' },
    { name: 'João Carlos Mendes', email: 'joao@email.com', phone: '(11) 99999-2222' },
  ];

  for (const client of clients) {
    const existing = await prisma.client.findFirst({ where: { email: client.email } });
    if (!existing) {
      await prisma.client.create({ data: client });
    }
  }
  console.log('✅ Clientes criados');

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
