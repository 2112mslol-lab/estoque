import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

const ClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal(''))
});

router.use(authenticate);


// GET /api/clients
router.get('/', async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { orders: true } } },
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

// POST /api/clients (APENAS ADMIN)
router.post('/', authorize(['ADMIN']), async (req, res) => {
  try {
    const validatedData = ClientSchema.parse(req.body);

    const client = await prisma.client.create({
      data: validatedData,
    });
    res.status(201).json(client);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// PUT /api/clients/:id (APENAS ADMIN)
router.put('/:id', authorize(['ADMIN']), async (req, res) => {
  try {
    const validatedData = ClientSchema.parse(req.body);
    
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: validatedData,
    });
    res.json(client);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors[0].message });
    }
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// DELETE /api/clients/:id (APENAS ADMIN)
router.delete('/:id', authorize(['ADMIN']), async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Cliente removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover cliente' });
  }
});

export default router;
