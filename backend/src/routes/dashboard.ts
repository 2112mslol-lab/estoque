import { Router } from 'express';
import prisma from '../lib/prisma';
import { StepStatus } from '@prisma/client';

const router = Router();

// GET /api/dashboard - Dados gerais do dashboard
router.get('/', async (_req, res) => {
  try {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);

    // Contagem por status de pedidos
    const [total, pending, inProduction, finished, delivered, cancelled] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'IN_PRODUCTION' } }),
      prisma.order.count({ where: { status: 'FINISHED' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
    ]);

    // Pedidos atrasados (data de entrega passou e não foram entregues)
    const delayedOrders = await prisma.order.findMany({
      where: {
        deliveryDate: { lt: now },
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
      include: {
        client: { select: { name: true } },
        items: { 
          include: { 
            productionSteps: { 
              where: { status: { in: [StepStatus.IN_PROGRESS, StepStatus.PENDING] } } 
            } 
          } 
        },
      },
      orderBy: { deliveryDate: 'asc' },
    });

    // Pedidos próximos do prazo (nos próximos 3 dias)
    const upcomingOrders = await prisma.order.findMany({
      where: {
        deliveryDate: { gte: now, lte: in3Days },
        status: { notIn: ['DELIVERED', 'CANCELLED', 'FINISHED'] },
      },
      include: { client: { select: { name: true } } },
      orderBy: { deliveryDate: 'asc' },
    });

    // Etapas atrasadas (em progresso e passou o tempo estimado)
    const inProgressSteps = await prisma.productionStep.findMany({
      where: {
        status: StepStatus.IN_PROGRESS,
        startedAt: { not: null },
      },
      include: {
        item: {
          include: {
            order: { include: { client: { select: { name: true } } } },
          }
        }
      },
    });

    const delayedSteps = inProgressSteps.filter(step => {
      if (!step.startedAt) return false;
      const elapsed = (Date.now() - step.startedAt.getTime()) / 1000 / 60;
      return elapsed > step.estimatedMinutes;
    });

    // Gargalos por etapa (quantas etapas em progresso)
    const stepCounts = await prisma.productionStep.groupBy({
      by: ['stepName', 'status'],
      _count: { id: true },
    });

    // Tempo médio por etapa (etapas concluídas)
    const completedSteps = await prisma.productionStep.findMany({
      where: {
        status: StepStatus.COMPLETED,
        startedAt: { not: null },
        completedAt: { not: null },
      },
    });

    const avgByStep: Record<string, { total: number; count: number }> = {};
    completedSteps.forEach(step => {
      if (!step.startedAt || !step.completedAt) return;
      const minutes = (step.completedAt.getTime() - step.startedAt.getTime()) / 1000 / 60;
      if (!avgByStep[step.stepName]) avgByStep[step.stepName] = { total: 0, count: 0 };
      avgByStep[step.stepName].total += minutes;
      avgByStep[step.stepName].count += 1;
    });

    const avgTimeByStep = Object.entries(avgByStep).map(([stepName, data]) => ({
      stepName,
      avgMinutes: Math.round(data.total / data.count),
      completedCount: data.count,
    }));

    // Materiais com estoque baixo
    const materials = await prisma.material.findMany();
    const lowStockCount = materials.filter(m => Number(m.currentStock) <= Number(m.minimumStock)).length;

    // Alertas não lidos
    const unreadAlerts = await prisma.alert.count({ where: { isRead: false } });

    res.json({
      orders: { total, pending, inProduction, finished, delivered, cancelled },
      delayedOrders,
      upcomingOrders,
      delayedSteps,
      stepCounts,
      avgTimeByStep,
      lowStockCount,
      unreadAlerts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

export default router;
