import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const { isRead } = req.query;
    const where: any = {};
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        order: {
          select: { orderNumber: true, client: { select: { name: true } } },
        },
      },
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar alertas' });
  }
});

// GET /api/alerts/count - Contador de alertas não lidos
router.get('/count', async (_req, res) => {
  try {
    const count = await prisma.alert.count({ where: { isRead: false } });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao contar alertas' });
  }
});

// PUT /api/alerts/:id/read - Marcar como lido
router.put('/:id/read', async (req, res) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar alerta como lido' });
  }
});

// PUT /api/alerts/read-all - Marcar todos como lidos
router.put('/read-all', async (_req, res) => {
  try {
    await prisma.alert.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'Todos os alertas marcados como lidos' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar alertas como lidos' });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.alert.delete({ where: { id: req.params.id } });
    res.json({ message: 'Alerta removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover alerta' });
  }
});

export default router;
