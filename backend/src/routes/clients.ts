import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

const ClientSchema = z.object({
  name:         z.string().min(1, 'Nome é obrigatório'),
  type:         z.enum(['PF', 'PJ']).default('PF'),
  cpfCnpj:      z.string().optional().or(z.literal('')),
  email:        z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone:        z.string().optional().or(z.literal('')),
  phone2:       z.string().optional().or(z.literal('')),
  instagram:    z.string().optional().or(z.literal('')),
  zipCode:      z.string().optional().or(z.literal('')),
  street:       z.string().optional().or(z.literal('')),
  number:       z.string().optional().or(z.literal('')),
  complement:   z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city:         z.string().optional().or(z.literal('')),
  state:        z.string().optional().or(z.literal('')),
  address:      z.string().optional().or(z.literal('')),
  notes:        z.string().optional().or(z.literal('')),
  isVip:        z.boolean().default(false),
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
  } catch {
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { orders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(client);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

// POST /api/clients (ADMIN)
router.post('/', authorize(['ADMIN']), async (req, res) => {
  try {
    const data = ClientSchema.parse(req.body);
    const client = await prisma.client.create({ data });
    res.status(201).json(client);
  } catch (error) {
    if (error instanceof z.ZodError)
      return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// PUT /api/clients/:id (ADMIN)
router.put('/:id', authorize(['ADMIN']), async (req, res) => {
  try {
    const data = ClientSchema.parse(req.body);
    const client = await prisma.client.update({ where: { id: req.params.id }, data });
    res.json(client);
  } catch (error) {
    if (error instanceof z.ZodError)
      return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// DELETE /api/clients/:id (ADMIN)
router.delete('/:id', authorize(['ADMIN']), async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Cliente removido com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover cliente' });
  }
});

export default router;
