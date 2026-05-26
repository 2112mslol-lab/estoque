import { Router } from 'express';
import prisma from '../lib/prisma';
import { StepStatus, OrderStatus } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { createChecklistsForSteps } from './createChecklistsForSteps';

const router = Router();

router.use(authenticate);

// GET /api/production/backlog - Itens aguardando início de produção
router.get('/backlog', authorize(['ADMIN']), async (req, res) => {
  try {
    const items = await prisma.orderItem.findMany({
      where: { isStarted: false, isStock: false },
      include: {
        order: { include: { client: true } }
      },
      orderBy: [
        { priorityRank: 'asc' },
        { createdAt: 'asc' }
      ]
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar backlog' });
  }
});

// POST /api/production/manual-launch - LANÇAMENTO MANUAL (ESTOQUE/AVULSO)
router.post('/manual-launch', authorize(['ADMIN', 'USER']), async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

    // Criar item de estoque
    const item = await prisma.orderItem.create({
      data: {
        productId,
        productName: product.name,
        quantity: parseInt(quantity),
        isStock: true,
        isStarted: true,
        status: 'IN_PRODUCTION'
      }
    });

    // Criar etapas
    const templates = await prisma.productionStepTemplate.findMany({
      where: { isActive: true },
      orderBy: { stepOrder: 'asc' },
      include: { checklistItems: true }
    });

    const hasBorda = product.name.toLowerCase().includes('borda');
    const filteredTemplates = hasBorda 
      ? templates 
      : templates.filter(t => t.name.toUpperCase() !== 'FINISHING');

    await prisma.productionStep.createMany({
      data: filteredTemplates.map((t, index) => ({
        orderItemId: item.id,
        stepTemplateId: t.id,
        stepName: t.name,
        stepOrder: index + 1,
        estimatedMinutes: t.estimatedMinutes,
        status: StepStatus.PENDING
      }))
    });

    await createChecklistsForSteps(prisma, item.id, templates);

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao lançar produção manual' });
  }
});

// POST /api/production/start/:id - Iniciar produção de um pedido
router.post('/start/:id', authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  
  try {
    const item = await prisma.orderItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });

    const qtyToStart = quantity ? parseInt(quantity) : item.quantity;

    // Buscar templates
    const templates = await prisma.productionStepTemplate.findMany({
      where: { isActive: true },
      orderBy: { stepOrder: 'asc' },
      include: { checklistItems: true }
    });

    let targetItemId = id;

    if (qtyToStart < item.quantity) {
      const newItem = await prisma.orderItem.create({
        data: {
          orderId: item.orderId,
          productId: item.productId,
          productName: item.productName,
          customization: item.customization,
          quantity: qtyToStart,
          status: 'IN_PRODUCTION',
          isStarted: true,
          priorityRank: item.priorityRank
        }
      });
      await prisma.orderItem.update({ where: { id }, data: { quantity: item.quantity - qtyToStart } });
      targetItemId = newItem.id;
    } else {
      await prisma.orderItem.update({ where: { id }, data: { isStarted: true, status: 'IN_PRODUCTION' } });
    }

    const hasBorda = item.productName.toLowerCase().includes('borda');
    const filteredTemplates = hasBorda 
      ? templates 
      : templates.filter(t => t.name.toUpperCase() !== 'FINISHING');

    await prisma.productionStep.deleteMany({ where: { orderItemId: targetItemId } });
    await prisma.productionStep.createMany({
      data: filteredTemplates.map((t, index) => ({
        orderItemId: targetItemId,
        stepTemplateId: t.id,
        stepName: t.name,
        stepOrder: index + 1,
        estimatedMinutes: t.estimatedMinutes,
        status: StepStatus.PENDING
      }))
    });

    await createChecklistsForSteps(prisma, targetItemId, templates);

    res.json({ message: 'Produção iniciada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao iniciar produção' });
  }
});

// PUT /api/production/steps/:id - ATUALIZAR ETAPA (COM INTELIGÊNCIA DE ALOCAÇÃO NA EMBALAGEM)
router.put('/steps/:id', async (req, res) => {
  const { id } = req.params;
  const { completedQuantity, status } = req.body;

  try {
    const step = await prisma.productionStep.findUnique({
      where: { id },
      include: { item: { include: { order: true } }, checklistItems: true }
    });

    if (!step) return res.status(404).json({ error: 'Etapa não encontrada' });

    const isLastStep = step.stepName.toUpperCase() === 'EMBALAGEM';
    const oldCompleted = step.completedQuantity;
    let newCompleted = completedQuantity !== undefined ? parseInt(completedQuantity) : (status === 'COMPLETED' ? step.item.quantity : oldCompleted);
    
    if (newCompleted >= step.item.quantity || status === 'COMPLETED') {
      const pendingChecklists = step.checklistItems.filter(c => c.isMandatory && !c.isChecked);
      if (pendingChecklists.length > 0) {
        return res.status(400).json({ error: 'Existem itens obrigatórios pendentes no checklist da etapa.' });
      }
    }

    const addedQuantity = newCompleted - oldCompleted;
    let finalItemQuantity = step.item.quantity;

    // SE FOR EMBALAGEM, ALOCAR PARA PEDIDOS (DIVERSÃO INTELIGENTE DE FLUXOS)
    if (isLastStep && addedQuantity > 0) {
      let remainingToAllocate = addedQuantity;

      // Buscar pedidos que precisam deste produto
      const pendingItems = await prisma.orderItem.findMany({
        where: {
          productId: step.item.productId,
          orderId: { not: null },
          status: { not: 'COMPLETED' },
          isStock: false
        },
        include: { order: true, productionSteps: true },
      });

      // ALGORITMO DE SMART MATCH: Estrela (Prioridade) > Proximidade de Conclusão > Data de Entrega
      const sortedCandidates = pendingItems.sort((a, b) => {
        // 1. Estrela (Prioridade)
        if (a.order?.isPriority && !b.order?.isPriority) return -1;
        if (!a.order?.isPriority && b.order?.isPriority) return 1;

        // 2. Proximidade de Conclusão (Mais itens prontos / Menos para acabar)
        const progressA = a.productionSteps.filter(s => s.status === 'COMPLETED').length / (a.productionSteps.length || 1);
        const progressB = b.productionSteps.filter(s => s.status === 'COMPLETED').length / (b.productionSteps.length || 1);
        if (progressA !== progressB) return progressB - progressA;

        // 3. Data de Entrega
        return new Date(a.order!.deliveryDate).getTime() - new Date(b.order!.deliveryDate).getTime();
      });

      for (const candidate of sortedCandidates) {
        if (remainingToAllocate <= 0) break;
        
        const needed = candidate.quantity;
        const allocated = Math.min(needed, remainingToAllocate);

        if (candidate.id === step.item.id) {
          // Se for o próprio item, mantém nele mesmo e diminui o saldo a alocar
          remainingToAllocate -= allocated;
          continue;
        }

        // Determinar ID do item a transferir (pode ser o step.item inteiro ou um split)
        let itemToTransferId = step.item.id;
        if (finalItemQuantity > allocated) {
          // Criar novo OrderItem com a quantidade alocada
          const newItem = await prisma.orderItem.create({
            data: {
              orderId: step.item.orderId,
              productId: step.item.productId,
              productName: step.item.productName,
              customization: step.item.customization,
              quantity: allocated,
              status: 'COMPLETED',
              isStarted: true,
              isPicked: step.item.isPicked,
              isStock: step.item.isStock,
              priorityRank: step.item.priorityRank
            }
          });

          // Copiar as etapas de produção para o novo item
          const currentSteps = await prisma.productionStep.findMany({
            where: { orderItemId: step.item.id }
          });
          await prisma.productionStep.createMany({
            data: currentSteps.map(s => ({
              orderItemId: newItem.id,
              stepTemplateId: s.stepTemplateId,
              stepName: s.stepName,
              stepOrder: s.stepOrder,
              status: StepStatus.COMPLETED,
              completedQuantity: allocated,
              estimatedMinutes: s.estimatedMinutes,
              startedAt: s.startedAt || new Date(),
              completedAt: s.completedAt || new Date(),
              assignedTo: s.assignedTo,
              notes: s.notes
            }))
          });

          // Atualizar quantidade do item original no banco de dados
          await prisma.orderItem.update({
            where: { id: step.item.id },
            data: { quantity: { decrement: allocated } }
          });

          // Ajustar a quantidade na etapa atual do item original
          await prisma.productionStep.update({
            where: { orderItemId_stepName: { orderItemId: step.item.id, stepName: step.stepName } },
            data: { completedQuantity: step.completedQuantity - allocated }
          });

          finalItemQuantity -= allocated;
          newCompleted -= allocated;
          itemToTransferId = newItem.id;
        }

        // Determinar ID do candidato a transferir (pode ser o candidate inteiro ou um split)
        let candidateToTransferId = candidate.id;
        if (candidate.quantity > allocated) {
          const newCand = await prisma.orderItem.create({
            data: {
              orderId: candidate.orderId,
              productId: candidate.productId,
              productName: candidate.productName,
              customization: candidate.customization,
              quantity: allocated,
              status: candidate.status,
              isStarted: candidate.isStarted,
              isPicked: candidate.isPicked,
              isStock: candidate.isStock,
              priorityRank: candidate.priorityRank
            }
          });

          const candSteps = await prisma.productionStep.findMany({
            where: { orderItemId: candidate.id }
          });
          if (candSteps.length > 0) {
            await prisma.productionStep.createMany({
              data: candSteps.map(s => ({
                orderItemId: newCand.id,
                stepTemplateId: s.stepTemplateId,
                stepName: s.stepName,
                stepOrder: s.stepOrder,
                status: s.status,
                completedQuantity: Math.min(s.completedQuantity, allocated),
                estimatedMinutes: s.estimatedMinutes,
                startedAt: s.startedAt,
                completedAt: s.completedAt,
                assignedTo: s.assignedTo,
                notes: s.notes
              }))
            });
          }

          await prisma.orderItem.update({
            where: { id: candidate.id },
            data: { quantity: { decrement: allocated } }
          });

          candidateToTransferId = newCand.id;
        }

        // Realizar o swap ou deleção de pendentes
        const tempOrderId = step.item.orderId;
        const candItem = await prisma.orderItem.findUnique({ where: { id: candidateToTransferId } });

        await prisma.orderItem.update({
          where: { id: itemToTransferId },
          data: { orderId: candItem?.orderId, status: 'COMPLETED' }
        });

        // Garantir que as etapas de produção do item transferido também estejam marcadas como concluídas
        await prisma.productionStep.updateMany({
          where: { orderItemId: itemToTransferId },
          data: { status: StepStatus.COMPLETED, completedQuantity: allocated, completedAt: new Date() }
        });

        if (tempOrderId) {
          await prisma.orderItem.update({
            where: { id: candidateToTransferId },
            data: {
              orderId: tempOrderId,
              isStarted: false,
              status: 'WAITING'
            }
          });
          await prisma.productionStep.deleteMany({
            where: { orderItemId: candidateToTransferId }
          });
        } else {
          // Se o item original era estoque, o candidato transferido (pendente) não precisa existir como estoque pendente
          await prisma.orderItem.delete({
            where: { id: candidateToTransferId }
          });
        }

        remainingToAllocate -= allocated;
      }
    }

    const updatedStep = await prisma.productionStep.update({
      where: { id },
      data: {
        completedQuantity: newCompleted,
        status: newCompleted >= finalItemQuantity ? StepStatus.COMPLETED : StepStatus.IN_PROGRESS,
        completedAt: newCompleted >= finalItemQuantity ? new Date() : null,
        startedAt: step.startedAt || new Date()
      },
      include: { item: { include: { order: true } } }
    });

    // Lógica padrão de conclusão de item/pedido
    if (updatedStep.status === StepStatus.COMPLETED) {
      const nextStep = await prisma.productionStep.findFirst({
        where: { orderItemId: step.orderItemId, stepOrder: { gt: step.stepOrder } }
      });

      if (!nextStep) {
        await prisma.orderItem.update({ where: { id: step.orderItemId }, data: { status: 'COMPLETED' } });
        if (step.item.orderId) {
          const total = await prisma.orderItem.count({ where: { orderId: step.item.orderId } });
          const done = await prisma.orderItem.count({ where: { orderId: step.item.orderId, status: 'COMPLETED' } });
          if (total === done) {
            await prisma.order.update({ where: { id: step.item.orderId }, data: { status: OrderStatus.FINISHED } });
          }
        }
      }
    }

    res.json(updatedStep);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
});

// POST /api/production/steps/:id/split - Desmembrar e avançar parcialmente
router.post('/steps/:id/split', async (req, res) => {
  const { id } = req.params;
  const { quantityToAdvance } = req.body;

  try {
    const step = await prisma.productionStep.findUnique({
      where: { id },
      include: { item: { include: { productionSteps: true } } }
    });
    if (!step) return res.status(404).json({ error: 'Etapa não encontrada' });

    const qty = parseInt(quantityToAdvance);
    if (qty <= 0 || qty >= step.item.quantity) {
      return res.status(400).json({ error: 'Quantidade para avançar deve ser maior que 0 e menor que o total.' });
    }

    // Valida checklist antes de avançar a parte
    const pendingChecklists = await prisma.checklistItem.findMany({
      where: { productionStepId: id, isMandatory: true, isChecked: false }
    });
    if (pendingChecklists.length > 0) {
      return res.status(400).json({ error: 'Existem itens obrigatórios pendentes no checklist da etapa.' });
    }

    // Cria novo OrderItem
    const newItem = await prisma.orderItem.create({
      data: {
        orderId: step.item.orderId,
        productId: step.item.productId,
        productName: step.item.productName,
        customization: step.item.customization,
        quantity: qty,
        status: step.item.status,
        isStarted: step.item.isStarted,
        isPicked: step.item.isPicked,
        isStock: step.item.isStock,
        priorityRank: step.item.priorityRank
      }
    });

    // Subtrai do atual
    await prisma.orderItem.update({
      where: { id: step.item.id },
      data: { quantity: step.item.quantity - qty }
    });

    // Copia as etapas
    await prisma.productionStep.createMany({
      data: step.item.productionSteps.map(s => ({
        orderItemId: newItem.id,
        stepTemplateId: s.stepTemplateId,
        stepName: s.stepName,
        stepOrder: s.stepOrder,
        status: s.stepOrder <= step.stepOrder ? StepStatus.COMPLETED : s.status,
        completedQuantity: s.stepOrder <= step.stepOrder ? qty : 0,
        completedAt: s.stepOrder <= step.stepOrder ? new Date() : null,
        estimatedMinutes: s.estimatedMinutes,
        startedAt: s.startedAt,
        assignedTo: s.assignedTo,
        notes: s.notes
      }))
    });

    res.json({ message: 'Item desmembrado e avançado com sucesso!', newItemId: newItem.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao desmembrar item' });
  }
});

// GET /api/production/kanban
router.get('/kanban', async (_req, res) => {
  try {
    const steps = await prisma.productionStep.findMany({
      where: { status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] } },
      include: {
        item: { include: { productionSteps: true, order: { include: { client: true } } } },
        checklistItems: true
      },
      orderBy: [
        { item: { order: { isPriority: 'desc' } } },
        { item: { priorityRank: 'asc' } },
        { item: { order: { deliveryDate: 'asc' } } }
      ]
    });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar etapas' });
  }
});

// GET /api/production/sector/:stepName
router.get('/sector/:stepName', async (req, res) => {
  const { stepName } = req.params;
  try {
    const steps = await prisma.productionStep.findMany({
      where: {
        stepName: stepName.toUpperCase(),
        status: { in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
      },
      include: {
        item: { include: { order: { include: { client: true } } } },
        checklistItems: true
      },
      orderBy: [
        { item: { order: { isPriority: 'desc' } } },
        { item: { priorityRank: 'asc' } },
        { item: { order: { deliveryDate: 'asc' } } }
      ]
    });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar setor' });
  }
});

// PUT /api/production/inject
router.post('/inject', authorize(['ADMIN', 'USER']), async (req, res) => {
    const { orderItemId, targetStepName, quantity } = req.body;
  
    try {
      const item = await prisma.orderItem.findUnique({
        where: { id: orderItemId },
        include: { productionSteps: true }
      });
  
      if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  
      const qtyToInject = quantity ? parseInt(quantity) : item.quantity;
      if (qtyToInject <= 0 || qtyToInject > item.quantity) {
        return res.status(400).json({ error: 'Quantidade inválida' });
      }
  
      const templates = await prisma.productionStepTemplate.findMany({
        where: { isActive: true },
        orderBy: { stepOrder: 'asc' },
        include: { checklistItems: true }
      });

      const hasBorda = item.productName.toLowerCase().includes('borda');
      const filteredTemplates = hasBorda 
        ? templates 
        : templates.filter(t => t.name.toUpperCase() !== 'FINISHING');

      const mappedTemplates = filteredTemplates.map((t, idx) => ({
        ...t,
        stepOrder: idx + 1
      }));

      const targetTemplate = mappedTemplates.find(t => t.name.toUpperCase() === targetStepName.toUpperCase());
      if (!targetTemplate) return res.status(400).json({ error: 'Setor de destino inválido' });
  
      let finalItemId = orderItemId;
  
      if (qtyToInject < item.quantity) {
        const newItem = await prisma.orderItem.create({
          data: {
            orderId: item.orderId,
            productId: item.productId,
            productName: item.productName,
            customization: item.customization,
            quantity: qtyToInject,
            status: 'IN_PRODUCTION',
            isStarted: true,
            priorityRank: item.priorityRank
          }
        });
        
        await prisma.orderItem.update({
          where: { id: orderItemId },
          data: { quantity: item.quantity - qtyToInject }
        });
  
        finalItemId = newItem.id;
      } else {
        await prisma.orderItem.update({
          where: { id: orderItemId },
          data: { isStarted: true, status: 'IN_PRODUCTION' }
        });
      }
  
      await prisma.productionStep.deleteMany({ where: { orderItemId: finalItemId } });
  
      await prisma.productionStep.createMany({
        data: mappedTemplates.map(t => ({
          orderItemId: finalItemId,
          stepTemplateId: t.id,
          stepName: t.name,
          stepOrder: t.stepOrder,
          estimatedMinutes: t.estimatedMinutes,
          status: t.stepOrder < targetTemplate.stepOrder ? StepStatus.COMPLETED : StepStatus.PENDING,
          completedQuantity: t.stepOrder < targetTemplate.stepOrder ? qtyToInject : 0,
          completedAt: t.stepOrder < targetTemplate.stepOrder ? new Date() : null
        }))
      });
  
      await createChecklistsForSteps(prisma, finalItemId, templates);

      res.json({ message: `Item injetado no setor ${targetStepName}` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao injetar item no setor' });
    }
  });

// POST /api/production/inject-avulso - Injetar peça avulsa SEM pedido num setor
router.post('/inject-avulso', authorize(['ADMIN', 'USER']), async (req, res) => {
  const { productId, productName, quantity, targetStepName, customization } = req.body;

  try {
    if (!productName || !targetStepName || !quantity || parseInt(quantity) <= 0) {
      return res.status(400).json({ error: 'Informe nome da peça, quantidade e setor de destino.' });
    }

    const qtyToInject = parseInt(quantity);

    const templates = await prisma.productionStepTemplate.findMany({
      where: { isActive: true },
      orderBy: { stepOrder: 'asc' },
      include: { checklistItems: true }
    });

    const hasBorda = (productName as string).toLowerCase().includes('borda');
    const filteredTemplates = hasBorda
      ? templates
      : templates.filter(t => t.name.toUpperCase() !== 'FINISHING');

    const mappedTemplates = filteredTemplates.map((t, idx) => ({
      ...t,
      stepOrder: idx + 1
    }));

    const targetTemplate = mappedTemplates.find(t => t.name.toUpperCase() === (targetStepName as string).toUpperCase());
    if (!targetTemplate) return res.status(400).json({ error: 'Setor de destino inválido' });

    // Cria item avulso (sem pedido, isStock=true)
    const item = await prisma.orderItem.create({
      data: {
        productId: productId || null,
        productName: productName as string,
        quantity: qtyToInject,
        customization: customization || null,
        isStock: true,
        isStarted: true,
        status: 'IN_PRODUCTION'
      }
    });

    // Cria etapas, marcando anteriores como concluídas
    await prisma.productionStep.createMany({
      data: mappedTemplates.map(t => ({
        orderItemId: item.id,
        stepTemplateId: t.id,
        stepName: t.name,
        stepOrder: t.stepOrder,
        estimatedMinutes: t.estimatedMinutes,
        status: t.stepOrder < targetTemplate.stepOrder ? StepStatus.COMPLETED : StepStatus.PENDING,
        completedQuantity: t.stepOrder < targetTemplate.stepOrder ? qtyToInject : 0,
        completedAt: t.stepOrder < targetTemplate.stepOrder ? new Date() : null
      }))
    });

    await createChecklistsForSteps(prisma, item.id, templates);

    res.json({ message: `Peça avulsa injetada no setor ${targetStepName}`, itemId: item.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao injetar peça avulsa' });
  }
});

// PUT /api/production/steps/:stepId/checklist/:itemId - Toggle checklist item
router.put('/steps/:stepId/checklist/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { isChecked } = req.body;
    
    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { isChecked }
    });

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar checklist' });
  }
});

router.put('/reorder', authorize(['ADMIN']), async (req, res) => {
    const { items } = req.body;
    try {
      await Promise.all(
        items.map((it: any) => 
          prisma.orderItem.update({
            where: { id: it.id },
            data: { priorityRank: it.rank }
          })
        )
      );
      res.json({ message: 'Ranking atualizado' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao reordenar ranking' });
    }
  });

export default router;
