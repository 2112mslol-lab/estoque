import { Router } from 'express';
import prisma from '../lib/prisma';
import { OrderStatus } from '@prisma/client';
import { io } from '../index';

const router = Router();

// ── Helpers de validação ──────────────────────────────────────────────────────

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10 || check === 11) check = 0;
  if (check !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10 || check === 11) check = 0;
  return check === parseInt(digits[10]);
}

function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (d: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += parseInt(d[i]) * weights[i];
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  return (
    calc(digits, w1) === parseInt(digits[12]) &&
    calc(digits, w2) === parseInt(digits[13])
  );
}

function validateCpfCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return validateCPF(digits);
  if (digits.length === 14) return validateCNPJ(digits);
  return false;
}

function validateToken(token: string): boolean {
  const catalogToken = process.env.CATALOG_SECRET_TOKEN;
  if (!catalogToken) return false;
  return token === catalogToken;
}

// ── GET /api/public/orders/:id - Rastreio público do pedido ──────────────────
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
      clientName: order.client?.name || 'Não informado',
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

// ── GET /api/public/catalog/:token — Catálogo de produtos (token protegido) ──
router.get('/catalog/:token', async (req, res) => {
  const { token } = req.params;

  if (!validateToken(token)) {
    return res.status(403).json({ error: 'Link inválido ou expirado.' });
  }

  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        colors: true,
        details: true,
        imageUrl: true,
      },
    });

    const companyWhatsapp = process.env.COMPANY_WHATSAPP || '';

    res.json({ products, companyWhatsapp });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar catálogo' });
  }
});

// ── POST /api/public/catalog/:token/request — Solicitar pedido via catálogo ──
router.post('/catalog/:token/request', async (req, res) => {
  const { token } = req.params;

  if (!validateToken(token)) {
    return res.status(403).json({ error: 'Link inválido ou expirado.' });
  }

  const {
    clientName,
    clientCpfCnpj,
    clientWhatsapp,
    deliveryDate,
    notes,
    items,
  } = req.body;

  // Validações
  if (!clientName || !clientName.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }

  if (!clientCpfCnpj || !validateCpfCnpj(clientCpfCnpj)) {
    return res.status(400).json({ error: 'CPF ou CNPJ inválido.' });
  }

  if (!clientWhatsapp || clientWhatsapp.replace(/\D/g, '').length < 10) {
    return res.status(400).json({ error: 'WhatsApp inválido.' });
  }

  if (!deliveryDate) {
    return res.status(400).json({ error: 'Data desejada é obrigatória.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Carrinho vazio. Adicione ao menos um produto.' });
  }

  try {
    // Gerar número de pedido
    const count = await prisma.order.count();
    const orderNumber = `CAT-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;

    // Montar bloco de notas com dados do cliente (não autenticado)
    const clientInfo = [
      `[PEDIDO VIA CATÁLOGO]`,
      `Cliente: ${clientName.trim()}`,
      `CPF/CNPJ: ${clientCpfCnpj.replace(/\D/g, '')}`,
      `WhatsApp: ${clientWhatsapp.trim()}`,
      ...(notes ? [`Obs: ${notes.trim()}`] : []),
    ].join('\n');

    // Validar que os produtos existem
    const productIds = items.map((i: any) => i.productId);
    const uniqueProductIds = [...new Set(productIds)];
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
    });

    if (products.length !== uniqueProductIds.length) {
      return res.status(400).json({ error: 'Um ou mais produtos não foram encontrados.' });
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // Criar pedido com status WAITING_CONFIRMATION
    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId: null, // sem vínculo a cliente cadastrado
        deliveryDate: new Date(deliveryDate),
        notes: clientInfo,
        status: OrderStatus.WAITING_CONFIRMATION,
        isPriority: false,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: productMap.get(item.productId)?.name || item.productName,
            customization: item.customization || null,
            quantity: Math.max(1, parseInt(item.quantity) || 1),
            status: 'WAITING',
            isStarted: false,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Notificar ADMIN via WebSocket em tempo real
    (global as any).io?.emit('catalog:new_request', {
      orderNumber: order.orderNumber,
      clientName: clientName.trim(),
      clientWhatsapp: clientWhatsapp.trim(),
      itemCount: order.items.length,
      orderId: order.id,
    });

    res.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      companyWhatsapp: process.env.COMPANY_WHATSAPP || '',
    });
  } catch (error) {
    console.error('Erro ao criar pedido via catálogo:', error);
    res.status(500).json({ error: 'Erro ao registrar pedido. Tente novamente.' });
  }
});

export default router;
