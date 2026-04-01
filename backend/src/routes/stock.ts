import { Router } from 'express';
import prisma from '../lib/prisma';
import { MovementType } from '@prisma/client';
import { emitEvent } from '../websocket/socket';

const router = Router();

// GET /api/stock/materials
router.get('/materials', async (_req, res) => {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { name: 'asc' },
    });

    // Adiciona flag de estoque baixo
    const materialsWithFlag = materials.map(m => ({
      ...m,
      isLowStock: Number(m.currentStock) <= Number(m.minimumStock),
    }));

    res.json(materialsWithFlag);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar materiais' });
  }
});

// GET /api/stock/materials/:id
router.get('/materials/:id', async (req, res) => {
  try {
    const material = await prisma.material.findUnique({
      where: { id: req.params.id },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { item: { include: { order: { select: { orderNumber: true } } } } },
        },
      },
    });
    if (!material) return res.status(404).json({ error: 'Material não encontrado' });
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar material' });
  }
});

// POST /api/stock/materials
router.post('/materials', async (req, res) => {
  try {
    const { name, description, unit, currentStock, minimumStock, costPerUnit, supplier } = req.body;
    if (!name || !unit) return res.status(400).json({ error: 'Nome e unidade são obrigatórios' });

    const material = await prisma.material.create({
      data: {
        name,
        description,
        unit,
        currentStock: parseFloat(currentStock || 0),
        minimumStock: parseFloat(minimumStock || 0),
        costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null,
        supplier,
      },
    });

    emitEvent('stock:updated', material);
    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar material' });
  }
});

// PUT /api/stock/materials/:id
router.put('/materials/:id', async (req, res) => {
  try {
    const { name, description, unit, minimumStock, costPerUnit, supplier } = req.body;

    const material = await prisma.material.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(unit && { unit }),
        ...(minimumStock !== undefined && { minimumStock: parseFloat(minimumStock) }),
        ...(costPerUnit !== undefined && { costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null }),
        ...(supplier !== undefined && { supplier }),
      },
    });

    emitEvent('stock:updated', material);
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
});

// POST /api/stock/movements - Registrar movimentação
router.post('/movements', async (req, res) => {
  try {
    const { materialId, orderId, type, quantity, reason } = req.body;
    if (!materialId || !type || !quantity) {
      return res.status(400).json({ error: 'materialId, type e quantity são obrigatórios' });
    }

    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material) return res.status(404).json({ error: 'Material não encontrado' });

    const qty = parseFloat(quantity);
    let newStock = Number(material.currentStock);

    if (type === MovementType.ENTRY || type === MovementType.ADJUSTMENT) {
      newStock += qty;
    } else if (type === MovementType.EXIT) {
      if (newStock < qty) {
        return res.status(400).json({ error: 'Estoque insuficiente' });
      }
      newStock -= qty;
    }

    const [movement, updatedMaterial] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { materialId, orderItemId: orderId, type, quantity: qty, reason },
      }),
      prisma.material.update({
        where: { id: materialId },
        data: { currentStock: newStock },
      }),
    ]);

    // Alerta de estoque baixo
    if (newStock <= Number(updatedMaterial.minimumStock)) {
      await prisma.alert.create({
        data: {
          type: 'LOW_STOCK',
          severity: newStock === 0 ? 'CRITICAL' : 'WARNING',
          title: 'Estoque Baixo',
          message: `Material "${updatedMaterial.name}" está com estoque baixo: ${newStock} ${updatedMaterial.unit}`,
        },
      });
      emitEvent('alert:new', { type: 'LOW_STOCK', material: updatedMaterial.name });
    }

    emitEvent('stock:updated', { ...updatedMaterial, isLowStock: newStock <= Number(updatedMaterial.minimumStock) });
    res.status(201).json({ movement, material: updatedMaterial });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar movimentação' });
  }
});

// GET /api/stock/low - Materiais com estoque baixo
router.get('/low', async (_req, res) => {
  try {
    const materials = await prisma.material.findMany();
    const lowStock = materials.filter(m => Number(m.currentStock) <= Number(m.minimumStock));
    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estoque baixo' });
  }
});

// GET /api/stock/items - Resumo de peças por status (Estoque de Produção)
router.get('/items', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        orderItems: {
          where: { isPicked: false }, // Apenas o que ainda não saiu para entrega/separação
          select: {
            status: true,
            quantity: true,
          }
        }
      }
    });

    const summary = products.map((p: any) => {
      const counts = {
        pending: 0,
        production: 0,
        packaged: 0
      };

      p.orderItems.forEach((item: any) => {
        if (item.status === 'PENDING') counts.pending += item.quantity;
        else if (item.status === 'IN_PRODUCTION') counts.production += item.quantity;
        else if (item.status === 'COMPLETED') counts.packaged += item.quantity;
      });

      return {
        id: p.id,
        name: p.name,
        ...counts
      };
    });

    res.json(summary.filter(s => (s.pending + s.production + s.packaged) > 0));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar resumo de itens' });
  }
});

export default router;
