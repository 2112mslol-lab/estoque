import { Router } from 'express';
import prisma from '../lib/prisma';
import { StepStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/production/kanban - Lista de etapas pendentes/em progresso para o Kanban
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
            order: {
              include: { client: true }
            }
          }
        }
      },

      orderBy: [
        { item: { order: { deliveryDate: 'asc' } } },
        { stepOrder: 'asc' }
      ]
    });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar etapas' });
  }
});

// GET /api/production/sector/:stepName - Lista de tarefas para um setor específico
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
            order: {
              include: { client: true }
            }
          }
        }
      },
      orderBy: { item: { order: { deliveryDate: 'asc' } } }
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

    // Logica de Status Automático baseado na quantidade
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
            order: {
              include: { client: true }
            }
          }
        }
      }
    });

    // Se concluiu a etapa, verificar se precisa criar/ativar a próxima ou atualizar o item
    if (updateData.status === StepStatus.COMPLETED) {
       // Buscar próxima etapa
       const nextStep = await prisma.productionStep.findFirst({
         where: {
           orderItemId: step.orderItemId,
           stepOrder: { gt: step.stepOrder }
         },
         orderBy: { stepOrder: 'asc' }
       });

       if (!nextStep) {
         // Não tem mais etapas, marcar o item como concluído
         await prisma.orderItem.update({
           where: { id: step.orderItemId },
           data: { status: 'COMPLETED' }
         });

         // Verificar se o pedido todo foi concluído
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
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
});

export default router;
