import { Router } from 'express';
import prisma from '../lib/prisma';
import { StepName } from '@prisma/client';

const router = Router();

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
    const stepName = req.params.stepName as StepName;

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
