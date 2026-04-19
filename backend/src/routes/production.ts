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

// POST /api/production/start/:id - Iniciar produção de um item (Gera etapas)
router.post('/start/:id', authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    const item = await prisma.orderItem.findUnique({
      where: { id },
      include: { productionSteps: true }
    });

    if (!item) return res.status(404).json({ error: 'Item não encontrado' });
    if (item.isStarted) return res.status(400).json({ error: 'Produção já iniciada para este item' });

    // Buscar templates de etapas
    const templates = await prisma.productionStepTemplate.findMany({
      where: { isActive: true },
      orderBy: { stepOrder: 'asc' }
    });

    // Criar etapas e marcar como iniciado (Limpando resquícios de tentativas anteriores)
    await prisma.$transaction([
      prisma.productionStep.deleteMany({
        where: { orderItemId: id }
      }),
      prisma.productionStep.createMany({
        data: templates.map(t => ({
          orderItemId: id,
          stepTemplateId: t.id,
          stepName: t.name,
          stepOrder: t.stepOrder,
          estimatedMinutes: t.estimatedMinutes,
          status: StepStatus.PENDING
        }))
      }),
      prisma.orderItem.update({
        where: { id },
        data: { isStarted: true, status: 'IN_PRODUCTION' }
      })
    ]);


    res.json({ message: 'Produção iniciada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao iniciar produção' });
  }
});

// PUT /api/production/reorder - Atualizar ranking de prioridade (APENAS ADMIN)
router.put('/reorder', authorize(['ADMIN']), async (req, res) => {
  const { items } = req.body; // Array de { id: string, rank: number }
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

// GET /api/production/kanban - Lista de etapas (ORDEM POR RANKING)
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

// GET /api/production/sector/:stepName - Setor (ORDEM POR RANKING)
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

// PUT /api/production/steps/:id - Atualizar status de uma etapa
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

export default router;
