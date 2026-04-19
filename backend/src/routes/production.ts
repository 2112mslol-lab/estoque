import { Router } from 'express';
import prisma from '../lib/prisma';
import { StepStatus, OrderStatus } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/production/backlog - Itens aguardando início de produção
router.get('/backlog', authorize(['ADMIN']), async (req, res) => {
  try {
    const items = await prisma.orderItem.findMany({
      where: { isStarted: false, isStock: false },
      include: {
        order: { include: { client: true } }
      },
      orderBy: [
        { priorityRank: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar backlog' });
  }
});

// POST /api/production/manual-launch - LANÇAMENTO MANUAL (ESTOQUE/AVULSO)
router.post('/manual-launch', authorize(['ADMIN', 'USER']), async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    // Criar item de estoque
    const item = await prisma.orderItem.create({
      data: {
        productId,
        productName: product.name,
        quantity: parseInt(quantity),
        isStock: true,
        isStarted: true,
        status: 'IN_PRODUCTION'
      }
    });

    // Criar etapas
    const templates = await prisma.productionStepTemplate.findMany({
      where: { isActive: true },
      orderBy: { stepOrder: 'asc' }
    });

    await prisma.productionStep.createMany({
      data: templates.map(t => ({
        orderItemId: item.id,
        stepTemplateId: t.id,
        stepName: t.name,
        stepOrder: t.stepOrder,
        estimatedMinutes: t.estimatedMinutes,
        status: StepStatus.PENDING
      }))
    });

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao lançar produção manual' });
  }
});

// POST /api/production/start/:id - Iniciar produção de um pedido
router.post('/start/:id', authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  
  try {
    const item = await prisma.orderItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });

    const qtyToStart = quantity ? parseInt(quantity) : item.quantity;

    // Buscar templates
    const templates = await prisma.productionStepTemplate.findMany({
      where: { isActive: true },
      orderBy: { stepOrder: 'asc' }
    });

    let targetItemId = id;

    if (qtyToStart < item.quantity) {
      const newItem = await prisma.orderItem.create({
        data: {
          orderId: item.orderId,
          productId: item.productId,
          productName: item.productName,
          customization: item.customization,
          quantity: qtyToStart,
          status: 'IN_PRODUCTION',
          isStarted: true,
          priorityRank: item.priorityRank
        }
      });
      await prisma.orderItem.update({ where: { id }, data: { quantity: item.quantity - qtyToStart } });
      targetItemId = newItem.id;
    } else {
      await prisma.orderItem.update({ where: { id }, data: { isStarted: true, status: 'IN_PRODUCTION' } });
    }

    await prisma.productionStep.deleteMany({ where: { orderItemId: targetItemId } });
    await prisma.productionStep.createMany({
      data: templates.map(t => ({
        orderItemId: targetItemId,
        stepTemplateId: t.id,
        stepName: t.name,
        stepOrder: t.stepOrder,
        estimatedMinutes: t.estimatedMinutes,
        status: StepStatus.PENDING
      }))
    });

    res.json({ message: 'Produção iniciada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao iniciar produção' });
  }
});

// PUT /api/production/steps/:id - ATUALIZAR ETAPA (COM INTELIGÊNCIA DE ALOCAÇÃO NA EMBALAGEM)
router.put('/steps/:id', async (req, res) => {
  const { id } = req.params;
  const { completedQuantity, status } = req.body;

  try {
    const step = await prisma.productionStep.findUnique({
      where: { id },
      include: { item: { include: { order: true } } }
    });

    if (!step) return res.status(404).json({ error: 'Etapa não encontrada' });

    const isLastStep = step.stepName.toUpperCase() === 'EMBALAGEM';
    const oldCompleted = step.completedQuantity;
    const newCompleted = completedQuantity !== undefined ? parseInt(completedQuantity) : (status === 'COMPLETED' ? step.item.quantity : oldCompleted);
    const addedQuantity = newCompleted - oldCompleted;

    const updatedStep = await prisma.productionStep.update({
      where: { id },
      data: {
        completedQuantity: newCompleted,
        status: newCompleted >= step.item.quantity ? StepStatus.COMPLETED : StepStatus.IN_PROGRESS,
        completedAt: newCompleted >= step.item.quantity ? new Date() : null,
        startedAt: step.startedAt || new Date()
      },
      include: { item: { include: { order: true } } }
    });

    // SE FOR EMBALAGEM E FOR ITEM DE ESTOQUE (OU PRODUÇÃO MANUAL), ALOCAR PARA PEDIDOS
    if (isLastStep && addedQuantity > 0 && step.item.isStock) {
      let remainingToAllocate = addedQuantity;

      // Buscar pedidos que precisam deste produto
      const pendingItems = await prisma.orderItem.findMany({
        where: {
          productId: step.item.productId,
          orderId: { not: null },
          status: { not: 'COMPLETED' },
          isStock: false
        },
        include: { order: true, productionSteps: true },
      });

      // ALGORITMO DE SMART MATCH: Estrela (Prioridade) > Proximidade de Conclusão > Data de Entrega
      const sortedCandidates = pendingItems.sort((a, b) => {
        // 1. Estrela (Prioridade)
        if (a.order?.isPriority && !b.order?.isPriority) return -1;
        if (!a.order?.isPriority && b.order?.isPriority) return 1;

        // 2. Proximidade de Conclusão (Mais itens prontos / Menos para acabar)
        const progressA = a.productionSteps.filter(s => s.status === 'COMPLETED').length / (a.productionSteps.length || 1);
        const progressB = b.productionSteps.filter(s => s.status === 'COMPLETED').length / (b.productionSteps.length || 1);
        if (progressA !== progressB) return progressB - progressA;

        // 3. Data de Entrega
        return new Date(a.order!.deliveryDate).getTime() - new Date(b.order!.deliveryDate).getTime();
      });

      for (const candidate of sortedCandidates) {
        if (remainingToAllocate <= 0) break;
        
        const needed = candidate.quantity; // Simplificando: aloca o item inteiro se possível
        const allocated = Math.min(needed, remainingToAllocate);

        // Se alocamos totalmente ou parcialmente, atualizamos o candidato
        await prisma.orderItem.update({
          where: { id: candidate.id },
          data: { status: 'COMPLETED' }
        });

        // Marcar todas as etapas do pedido como concluídas (recebeu do estoque)
        await prisma.productionStep.updateMany({
          where: { orderItemId: candidate.id },
          data: { status: StepStatus.COMPLETED, completedQuantity: candidate.quantity, completedAt: new Date() }
        });

        remainingToAllocate -= allocated;
      }
    }

    // Lógica padrão de conclusão de item/pedido
    if (updatedStep.status === StepStatus.COMPLETED) {
      const nextStep = await prisma.productionStep.findFirst({
        where: { orderItemId: step.orderItemId, stepOrder: { gt: step.stepOrder } }
      });

      if (!nextStep) {
        await prisma.orderItem.update({ where: { id: step.orderItemId }, data: { status: 'COMPLETED' } });
        if (step.item.orderId) {
          const total = await prisma.orderItem.count({ where: { orderId: step.item.orderId } });
          const done = await prisma.orderItem.count({ where: { orderId: step.item.orderId, status: 'COMPLETED' } });
          if (total === done) {
            await prisma.order.update({ where: { id: step.item.orderId }, data: { status: OrderStatus.FINISHED } });
          }
        }
      }
    }

    res.json(updatedStep);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
});

// GET /api/production/kanban
router.get('/kanban', async (_req, res) => {
  try {
    const steps = await prisma.productionStep.findMany({
      where: { status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] } },
      include: {
        item: { include: { productionSteps: true, order: { include: { client: true } } } }
      },
      orderBy: [
        { item: { order: { isPriority: 'desc' } } },
        { item: { priorityRank: 'asc' } },
        { item: { order: { deliveryDate: 'asc' } } }
      ]
    });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar etapas' });
  }
});

// GET /api/production/sector/:stepName
router.get('/sector/:stepName', async (req, res) => {
  const { stepName } = req.params;
  try {
    const steps = await prisma.productionStep.findMany({
      where: {
        stepName: stepName.toUpperCase(),
        status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
      },
      include: {
        item: { include: { order: { include: { client: true } } } }
      },
      orderBy: [
        { item: { order: { isPriority: 'desc' } } },
        { item: { priorityRank: 'asc' } },
        { item: { order: { deliveryDate: 'asc' } } }
      ]
    });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar setor' });
  }
});

// PUT /api/production/inject
router.post('/inject', authorize(['ADMIN', 'USER']), async (req, res) => {
    const { orderItemId, targetStepName, quantity } = req.body;
  
    try {
      const item = await prisma.orderItem.findUnique({
        where: { id: orderItemId },
        include: { productionSteps: true }
      });
  
      if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  
      const qtyToInject = quantity ? parseInt(quantity) : item.quantity;
      if (qtyToInject <= 0 || qtyToInject > item.quantity) {
        return res.status(400).json({ error: 'Quantidade inválida' });
      }
  
      const templates = await prisma.productionStepTemplate.findMany({
        where: { isActive: true },
        orderBy: { stepOrder: 'asc' }
      });
  
      const targetTemplate = templates.find(t => t.name.toUpperCase() === targetStepName.toUpperCase());
      if (!targetTemplate) return res.status(400).json({ error: 'Setor de destino inválido' });
  
      let finalItemId = orderItemId;
  
      if (qtyToInject < item.quantity) {
        const newItem = await prisma.orderItem.create({
          data: {
            orderId: item.orderId,
            productId: item.productId,
            productName: item.productName,
            customization: item.customization,
            quantity: qtyToInject,
            status: 'IN_PRODUCTION',
            isStarted: true,
            priorityRank: item.priorityRank
          }
        });
        
        await prisma.orderItem.update({
          where: { id: orderItemId },
          data: { quantity: item.quantity - qtyToInject }
        });
  
        finalItemId = newItem.id;
      } else {
        await prisma.orderItem.update({
          where: { id: orderItemId },
          data: { isStarted: true, status: 'IN_PRODUCTION' }
        });
      }
  
      await prisma.productionStep.deleteMany({ where: { orderItemId: finalItemId } });
  
      await prisma.productionStep.createMany({
        data: templates.map(t => ({
          orderItemId: finalItemId,
          stepTemplateId: t.id,
          stepName: t.name,
          stepOrder: t.stepOrder,
          estimatedMinutes: t.estimatedMinutes,
          status: t.stepOrder < targetTemplate.stepOrder ? StepStatus.COMPLETED : StepStatus.PENDING,
          completedQuantity: t.stepOrder < targetTemplate.stepOrder ? qtyToInject : 0,
          completedAt: t.stepOrder < targetTemplate.stepOrder ? new Date() : null
        }))
      });
  
      res.json({ message: `Item injetado no setor ${targetStepName}` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao injetar item no setor' });
    }
  });

router.put('/reorder', authorize(['ADMIN']), async (req, res) => {
    const { items } = req.body;
    try {
      await Promise.all(
        items.map((it: any) => 
          prisma.orderItem.update({
            where: { id: it.id },
            data: { priorityRank: it.rank }
          })
        )
      );
      res.json({ message: 'Ranking atualizado' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao reordenar ranking' });
    }
  });

export default router;
