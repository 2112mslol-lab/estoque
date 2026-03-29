import { Router } from 'express';
import prisma from '../lib/prisma';
import { io } from '../index';
import { StepStatus } from '@prisma/client';

const router = Router();

// GET /api/production/kanban - Retornar etapas agrupadas por setor
router.get('/kanban', async (_req, res) => {
  try {
    // Buscar todas as etapas ativas (Pendente ou Em Progresso) vinculadas às PEÇAS (OrderItems)
    const steps = await prisma.productionStep.findMany({
      where: {
        status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
      },
      include: {
        item: {
          include: {
            order: {
              include: { client: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mapear cada etapa para o formato esperado pelo Kanban
    // Cada peça em um setor torna-se um 'card'
    res.json(steps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dados do Kanban' });
  }
});

// PUT /api/production/steps/:id - Atualizar status de uma etapa
router.put('/steps/:id', async (req, res) => {
  const { id } = req.params;
  const { status, notes, assignedTo } = req.body;

  try {
    const now = new Date();
    const updateData: any = { status, notes, assignedTo };

    if (status === StepStatus.IN_PROGRESS) {
      updateData.startedAt = now;
    } else if (status === StepStatus.COMPLETED) {
      updateData.completedAt = now;
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

    // Atualizar status do ITEM caso necessário
    if (status === StepStatus.COMPLETED) {
      // Verificar se TODAS as etapas do item foram concluídas
      const itemSteps = await prisma.productionStep.findMany({
        where: { orderItemId: step.orderItemId }
      });
      const allDone = itemSteps.every(s => s.status === StepStatus.COMPLETED);
      if (allDone) {
        await prisma.orderItem.update({
          where: { id: step.orderItemId },
          data: { status: 'COMPLETED' }
        });
      }
    } else if (status === StepStatus.IN_PROGRESS) {
      await prisma.orderItem.update({
        where: { id: step.orderItemId },
        data: { status: 'IN_PRODUCTION' }
      });
    }

    // Notificar via WebSocket
    io.emit('production:step-updated', step);

    res.json(step);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
});

export default router;
