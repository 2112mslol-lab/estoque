import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { StepStatus } from '@prisma/client';



const router = Router();

// GET /api/configs/templates - Listar templates de etapas
router.get('/templates', async (_req, res) => {
  try {
    const templates = await prisma.productionStepTemplate.findMany({
      orderBy: { stepOrder: 'asc' },
    });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

// ... (get routes)

// POST /api/configs/templates - Criar novo template
router.post('/templates', async (req, res) => {
  try {
    const { name, stepOrder, estimatedMinutes, color } = req.body;
    const template = await prisma.productionStepTemplate.create({
      data: { 
        name: name.toUpperCase().replace(/\s+/g, '_'), 
        stepOrder: parseInt(stepOrder), 
        estimatedMinutes: parseInt(estimatedMinutes), 
        color 
      },
    });
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar template' });
  }
});

// PUT /api/configs/templates/:id - Atualizar template
router.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, stepOrder, estimatedMinutes, color, isActive } = req.body;
    const template = await prisma.productionStepTemplate.update({
      where: { id },
      data: { 
        name: name?.toUpperCase().replace(/\s+/g, '_'), 
        stepOrder: stepOrder !== undefined ? parseInt(stepOrder) : undefined, 
        estimatedMinutes: estimatedMinutes !== undefined ? parseInt(estimatedMinutes) : undefined, 
        color,
        isActive
      },
    });
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar template' });
  }
});

// DELETE /api/configs/templates/:id - Excluir template
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.productionStepTemplate.delete({ where: { id } });
    res.json({ message: 'Template excluído' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir template' });
  }
});

router.use(authenticate);


router.use(authorize(['ADMIN']));


// GET /api/configs/steps - Configurações das etapas
router.get('/steps', async (_req, res) => {
  try {
    const configs = await prisma.stepConfig.findMany({
      orderBy: { stepName: 'asc' },
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// PUT /api/configs/steps/:stepName - Atualizar tempo estimado de etapa
router.put('/steps/:stepName', async (req, res) => {
  try {
    const { estimatedMinutes, description } = req.body;
    const stepName = req.params.stepName;


    const config = await prisma.stepConfig.upsert({
      where: { stepName },
      update: {
        ...(estimatedMinutes && { estimatedMinutes: parseInt(estimatedMinutes) }),
        ...(description !== undefined && { description }),
      },
      create: {
        stepName,
        estimatedMinutes: parseInt(estimatedMinutes) || 60,
        description,
      },
    });

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar configuração' });
  }
});

export default router;
