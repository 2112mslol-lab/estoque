import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);


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

// POST /api/products - Cadastrar novo modelo (APENAS ADMIN)
router.post('/', authorize(['ADMIN']), async (req, res) => {
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

// DELETE /api/products/:id - Remover modelo (APENAS ADMIN)
router.delete('/:id', authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir modelo' });
  }
});

export default router;
