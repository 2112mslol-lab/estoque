import { Router } from 'express';
import prisma from '../lib/prisma';
import { StepStatus } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/production/backlog - Itens aguardando início de produção
router.get('/backlog', authorize(['ADMIN']), async (req, res) => {
  try {
    const items = await prisma.orderItem.findMany({
      where: { isStarted: false },
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

// POST /api/production/start/:id - Iniciar produção (Suporta quantidade parcial e reinício)
router.post('/start/:id', authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  
  try {
    const item = await prisma.orderItem.findUnique({
      where: { id },
    });

    if (!item) return res.status(404).json({ error: 'Item não encontrado' });

    const qtyToStart = quantity ? parseInt(quantity) : item.quantity;
    if (qtyToStart <= 0 || qtyToStart > item.quantity) {
      return res.status(400).json({ error: 'Quantidade inválida para iniciar' });
    }

    // Buscar templates de etapas
    const templates = await prisma.productionStepTemplate.findMany({
      where: { isActive: true },
      orderBy: { stepOrder: 'asc' }
    });

    let targetItemId = id;

    // Se a quantidade for parcial, desmembramos o item
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
      
      await prisma.orderItem.update({
        where: { id },
        data: { quantity: item.quantity - qtyToStart }
      });

      targetItemId = newItem.id;
    } else {
      // Iniciar o item inteiro (ou reiniciar item que já estava como "true")
      await prisma.orderItem.update({
        where: { id },
        data: { isStarted: true, status: 'IN_PRODUCTION' }
      });
    }

    // LIMPEZA E CRIAÇÃO DAS ETAPAS (Garante que não haja erro 500 ou 400 por duplicidade)
    await prisma.$transaction([
      prisma.productionStep.deleteMany({
        where: { orderItemId: targetItemId }
      }),
      prisma.productionStep.createMany({
        data: templates.map(t => ({
          orderItemId: targetItemId,
          stepTemplateId: t.id,
          stepName: t.name,
          stepOrder: t.stepOrder,
          estimatedMinutes: t.estimatedMinutes,
          status: StepStatus.PENDING
        }))
      })
    ]);

    res.json({ message: 'Produção iniciada com sucesso', startedQuantity: qtyToStart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao iniciar produção' });
  }
});

// PUT /api/production/reorder - Atualizar ranking de prioridade
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

// GET /api/production/kanban
router.get('/kanban', async (_req, res) => {
  try {
    const steps = await prisma.productionStep.findMany({
      where: {
        status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
      },
      include: {
        item: {
          include: {
            productionSteps: true,
            order: { include: { client: true } }
          }
        }
      },
      orderBy: [
        { item: { priorityRank: 'asc' } },
        { item: { order: { deliveryDate: 'asc' } } },
        { stepOrder: 'asc' }
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
        item: {
          include: {
            order: { include: { client: true } }
          }
        }
      },
      orderBy: [
        { item: { priorityRank: 'asc' } },
        { item: { order: { deliveryDate: 'asc' } } }
      ]
    });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tarefas do setor' });
  }
});

// PUT /api/production/steps/:id
router.put('/steps/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { status, notes, assignedTo, completedQuantity } = req.body;

    const currentStep = await prisma.productionStep.findUnique({
      where: { id },
      include: { item: true }
    });

    if (!currentStep) return res.status(404).json({ error: 'Etapa não encontrada' });

    const now = new Date();
    const updateData: any = { 
      notes, 
      assignedTo,
      completedQuantity: completedQuantity !== undefined ? parseInt(completedQuantity) : undefined 
    };

    if (completedQuantity !== undefined) {
      const qty = parseInt(completedQuantity);
      if (qty >= currentStep.item.quantity) {
        updateData.status = StepStatus.COMPLETED;
        updateData.completedAt = now;
      } else if (qty > 0) {
        updateData.status = StepStatus.IN_PROGRESS;
        if (!currentStep.startedAt) updateData.startedAt = now;
      }
    } else if (status) {
      updateData.status = status;
      if (status === StepStatus.IN_PROGRESS && !currentStep.startedAt) updateData.startedAt = now;
      if (status === StepStatus.COMPLETED) {
        updateData.completedAt = now;
        updateData.completedQuantity = currentStep.item.quantity;
      }
    }

    const step = await prisma.productionStep.update({
      where: { id },
      data: updateData,
      include: {
        item: {
          include: {
            order: { include: { client: true } }
          }
        }
      }
    });

    if (updateData.status === StepStatus.COMPLETED) {
       const nextStep = await prisma.productionStep.findFirst({
         where: {
           orderItemId: step.orderItemId,
           stepOrder: { gt: step.stepOrder }
         },
         orderBy: { stepOrder: 'asc' }
       });

       if (!nextStep) {
         await prisma.orderItem.update({
           where: { id: step.orderItemId },
           data: { status: 'COMPLETED' }
         });

         const totalItems = await prisma.orderItem.count({ where: { orderId: step.item.orderId } });
         const completedItems = await prisma.orderItem.count({ where: { orderId: step.item.orderId, status: 'COMPLETED' } });

         if (totalItems === completedItems) {
           await prisma.order.update({
             where: { id: step.item.orderId },
             data: { status: 'FINISHED' }
           });
         }
       }
    }

    res.json(step);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
});

// POST /api/production/inject - Injetar peça diretamente em um setor (Pular etapas)
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

    // Buscar todos os templates ativos
    const templates = await prisma.productionStepTemplate.findMany({
      where: { isActive: true },
      orderBy: { stepOrder: 'asc' }
    });

    const targetTemplate = templates.find(t => t.name.toUpperCase() === targetStepName.toUpperCase());
    if (!targetTemplate) return res.status(400).json({ error: 'Setor de destino inválido' });

    let finalItemId = orderItemId;

    // Se a quantidade for parcial, desmembrar (split)
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

    // Criar/Resetar etapas até o alvo
    // Etapas anteriores ao alvo = COMPLETED
    // Etapa alvo e posteriores = PENDING
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

export default router;

