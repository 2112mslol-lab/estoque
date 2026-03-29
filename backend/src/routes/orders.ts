import { Router } from 'express';
import prisma from '../lib/prisma';
import { io } from '../index';
import { OrderStatus, StepName, StepStatus } from '@prisma/client';

const router = Router();

// GET /api/orders - Listar todos os pedidos com detalhes
router.get('/', async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        client: { select: { name: true } },
        items: {
          include: {
            productionSteps: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

// POST /api/orders - Criar um novo pedido com MÚLTIPLOS ITENS
router.post('/', async (req, res) => {
  try {
    const { clientId, deliveryDate, notes, items } = req.body;

    // Gerar um número de pedido sequencial simples (ex: ORD-2024-001)
    const count = await prisma.order.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;

    // Buscar configurações de etapas para o tempo estimado
    const stepConfigs = await prisma.stepConfig.findMany();
    const stepConfigsMap = stepConfigs.reduce((acc, curr) => ({
      ...acc,
      [curr.stepName]: curr.estimatedMinutes
    }), {} as Record<string, number>);

    // Criar o pedido e já incluir os itens e suas etapas de produção
    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId,
        deliveryDate: new Date(deliveryDate),
        notes,
        status: OrderStatus.PENDING,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            customization: item.customization,
            quantity: item.quantity || 1,
            productionSteps: {
              create: [
                { stepName: StepName.CUTTING,   stepOrder: 1, estimatedMinutes: stepConfigsMap[StepName.CUTTING] || 60 },
                { stepName: StepName.MOLDING,   stepOrder: 2, estimatedMinutes: stepConfigsMap[StepName.MOLDING] || 120 },
                { stepName: StepName.COOLING,   stepOrder: 3, estimatedMinutes: stepConfigsMap[StepName.COOLING] || 180 },
                { stepName: StepName.FINISHING, stepOrder: 4, estimatedMinutes: stepConfigsMap[StepName.FINISHING] || 90 },
                { stepName: StepName.PACKAGING, stepOrder: 5, estimatedMinutes: stepConfigsMap[StepName.PACKAGING] || 30 },
              ]
            }
          }))
        }
      },
      include: {
        items: { include: { productionSteps: true } }
      }
    });

    // Notificar via WebSocket
    io.emit('order:new', order);

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

// GET /api/orders/:id - Detalhes do pedido
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        items: {
          include: { productionSteps: true }
        }
      }
    });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
});

// PUT /api/orders/:id - Atualizar pedido
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { deliveryDate, notes, status } = req.body;
  try {
    const order = await prisma.order.update({
      where: { id },
      data: {
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        notes,
        status
      },
      include: { client: true, items: true }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar pedido' });
  }
});

// DELETE /api/orders/:id - Excluir pedido
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.order.delete({ where: { id } });
    res.json({ message: 'Pedido excluído' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir pedido' });
  }
});

export default router;
