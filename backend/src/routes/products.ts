import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── Configuração do Multer (disco local) ──────────────────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'products');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 
      'image/svg+xml', 'image/bmp', 'image/heic', 'image/heif',
      'application/pdf'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato inválido. Use JPEG, PNG, WEBP, GIF, SVG, BMP, HEIC, HEIF ou PDF.'));
  },
});

// ── GET /api/products ─────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar modelos' });
  }
});

// ── POST /api/products ────────────────────────────────────────────────────────
router.post('/', authorize(['ADMIN']), async (req, res) => {
  const { name, description, colors, details } = req.body;
  try {
    const product = await prisma.product.create({
      data: { name, description: description || null, colors: colors || [], details: details || [] },
    });
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Erro ao cadastrar modelo' });
  }
});

// ── PUT /api/products/:id ─────────────────────────────────────────────────────
router.put('/:id', authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name, description, colors, details } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(colors !== undefined && { colors }),
        ...(details !== undefined && { details }),
      },
    });
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Erro ao editar modelo' });
  }
});

// ── POST /api/products/:id/image ──────────────────────────────────────────────
// Faz upload de foto e atualiza imageUrl no produto
router.post(
  '/:id/image',
  authorize(['ADMIN']),
  upload.single('image'),
  async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

    try {
      // Busca produto para deletar imagem antiga
      const existing = await prisma.product.findUnique({ where: { id } });
      if (existing?.imageUrl) {
        const oldPath = path.join(process.cwd(), existing.imageUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const relPath = `uploads/products/${req.file.filename}`;
      const product = await prisma.product.update({
        where: { id },
        data: { imageUrl: relPath },
      });
      res.json(product);
    } catch {
      res.status(500).json({ error: 'Erro ao salvar imagem' });
    }
  }
);

// ── DELETE /api/products/:id/image ───────────────────────────────────────────
router.delete('/:id/image', authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (existing?.imageUrl) {
      const oldPath = path.join(process.cwd(), existing.imageUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const product = await prisma.product.update({ where: { id }, data: { imageUrl: null } });
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Erro ao remover imagem' });
  }
});

// ── DELETE /api/products/:id ──────────────────────────────────────────────────
router.delete('/:id', authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (existing?.imageUrl) {
      const oldPath = path.join(process.cwd(), existing.imageUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir modelo' });
  }
});

export default router;
