import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/public/orders/:id - Rastreio público do pedido
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            name: true,
          },
        },
        items: {
          include: {
            productionSteps: {
              orderBy: {
                stepOrder: 'asc',
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Filtrar dados sensíveis antes de enviar ao público
    const publicData = {
      orderNumber: order.orderNumber,
      clientName: order.client.name,
      status: order.status,
      deliveryDate: order.deliveryDate,
      items: order.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        status: item.status,
        steps: item.productionSteps.map(step => ({
          stepName: step.stepName,
          status: step.status,
          completedAt: step.completedAt,
        })),
      })),
    };

    res.json(publicData);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
});

export default router;
