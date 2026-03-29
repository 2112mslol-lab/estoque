import prisma from '../lib/prisma';
import { io } from '../index';
import { AlertType, AlertSeverity, StepStatus } from '@prisma/client';

export async function checkAndCreateAlerts() {
  console.log('🔍 Executando verificador de alertas (Setores e Peças)...');
  
  try {
    const now = new Date();

    // 1. Pedidos próximos do prazo (3 dias)
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);

    const upcomingOrders = await prisma.order.findMany({
      where: {
        deliveryDate: { gte: now, lte: in3Days },
        status: { notIn: ['DELIVERED', 'CANCELLED', 'FINISHED'] },
      },
      include: { alerts: { where: { type: AlertType.DEADLINE_APPROACHING } } }
    });

    for (const order of upcomingOrders) {
      if (order.alerts.length === 0) {
        const alert = await prisma.alert.create({
          data: {
            type: AlertType.DEADLINE_APPROACHING,
            severity: AlertSeverity.WARNING,
            title: `Prazo Próximo: Pedido ${order.orderNumber}`,
            message: `A entrega está prevista para ${order.deliveryDate.toLocaleDateString('pt-BR')}.`,
            orderId: order.id,
          }
        });
        io.emit('alert:new', alert);
      }
    }

    // 2. Etapas atrasadas (Peças em um setor por mais tempo que o estimado)
    const inProgressSteps = await prisma.productionStep.findMany({
      where: {
        status: StepStatus.IN_PROGRESS,
        startedAt: { not: null },
      },
      include: {
        item: {
          include: { 
            order: { include: { client: { select: { name: true } } } } 
          }
        }
      }
    });

    for (const step of inProgressSteps) {
      if (!step.startedAt) continue;
      
      const elapsedMinutes = (now.getTime() - step.startedAt.getTime()) / 1000 / 60;
      if (elapsedMinutes > step.estimatedMinutes) {
        // Criar alerta de setor atrasado
        const title = `Setor Atrasado: ${step.stepName}`;
        const message = `A peça "${step.item.productName}" (Pedido ${step.item.order.orderNumber}) está no setor de ${step.stepName} há ${Math.round(elapsedMinutes)} min (Máx: ${step.estimatedMinutes}min).`;
        
        // Evitar duplicidade de alerta para a mesma etapa
        const existingAlert = await prisma.alert.findFirst({
          where: { 
            orderId: step.item.orderId,
            type: AlertType.STEP_DELAYED,
            message: { contains: step.stepName }
          }
        });

        if (!existingAlert) {
          const alert = await prisma.alert.create({
            data: {
              type: AlertType.STEP_DELAYED,
              severity: AlertSeverity.CRITICAL,
              title,
              message,
              orderId: step.item.orderId,
            }
          });
          io.emit('alert:new', alert);
          console.log(`⚠️ Alerta: Gargalo no setor ${step.stepName} - Peça: ${step.item.productName}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro no scheduler de alertas:', error);
  }
}

// Rodar a cada 5 minutos
setInterval(checkAndCreateAlerts, 5 * 60 * 1000);
