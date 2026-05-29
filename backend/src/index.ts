import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import orderRoutes from './routes/orders';
import productRoutes from './routes/products';
import productionRoutes from './routes/production';
import stockRoutes from './routes/stock';
import alertRoutes from './routes/alerts';
import dashboardRoutes from './routes/dashboard';
import configRoutes from './routes/configs';
import publicRoutes from './routes/public';


import { setupWebSocket } from './websocket/socket';
import { checkAndCreateAlerts } from './services/alertScheduler';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Segurança: Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: 'Muitas requisições vindas deste IP, tente novamente após 15 minutos',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Funções para garantir que os usuários iniciais existam
async function ensureInitialUsers() {
  try {
    // 1. Administrador Inicial
    const adminEmail = 'admin@toqueideal.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
      console.log('👷 Criando usuário administrador inicial...');
      const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          name: 'Administrador Toque Ideal',
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      console.log('✅ Administrador criado com sucesso!');
    }

    // 2. Colaborador Inicial (Funcionário)
    const employeeEmail = 'funcionario@toqueideal.com';
    const existingEmployee = await prisma.user.findUnique({ where: { email: employeeEmail } });

    if (!existingEmployee) {
      console.log('👷 Criando usuário funcionário inicial...');
      const employeePassword = process.env.INITIAL_EMPLOYEE_PASSWORD || 'funcionario123';
      const hashedPassword = await bcrypt.hash(employeePassword, 10);
      await prisma.user.create({
        data: {
          name: 'Colaborador Toque Ideal',
          email: employeeEmail,
          password: hashedPassword,
          role: 'EMPLOYEE'
        }
      });
      console.log('✅ Funcionário criado com sucesso!');
    }
  } catch (error) {
    console.error('❌ Falha ao garantir usuários iniciais:', error);
  }
}

// Chamar a função
ensureInitialUsers();


// WebSocket
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? allowedOrigin : "*",
    methods: ['GET', 'POST'],
  },
});

// Disponibiliza io globalmente para outros módulos
(global as any).io = io;

// Middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? allowedOrigin : true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Garantir que pasta de uploads existe
const uploadsDir = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch (error) {
  console.warn('⚠️ Impossível criar pasta uploads (ambiente read-only da Vercel)');
}

// Servir arquivos estáticos de uploads (fotos dos produtos)
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir)); // Fallback para URLs no frontend que usam /api como base

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/configs', configRoutes);
app.use('/api/public', publicRoutes);


// ...
setupWebSocket(io);

// Iniciar scheduler de alertas manual se necessário (pode não rodar em serverless gratuito, mas mantemos o código)
checkAndCreateAlerts();

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Servidor local na porta ${PORT}`);
  });
}

export { io };
export default app;
