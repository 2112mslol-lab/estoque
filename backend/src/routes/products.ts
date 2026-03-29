import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/products - Listar modelos
router.get('/', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar modelos' });
  }
});

// POST /api/products - Cadastrar novo modelo
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  try {
    const product = await prisma.product.create({
      data: { name, description },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar modelo' });
  }
});

// DELETE /api/products/:id - Remover modelo
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir modelo' });
  }
});

export default router;
