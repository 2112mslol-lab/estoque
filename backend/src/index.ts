import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import clientRoutes from './routes/clients';
import orderRoutes from './routes/orders';
import productRoutes from './routes/products';
import productionRoutes from './routes/production';
import stockRoutes from './routes/stock';
import alertRoutes from './routes/alerts';
import dashboardRoutes from './routes/dashboard';
import configRoutes from './routes/configs';

import { setupWebSocket } from './websocket/socket';
import { checkAndCreateAlerts } from './services/alertScheduler';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// WebSocket
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Disponibiliza io globalmente para outros módulos
(global as any).io = io;

// Middlewares
app.use(cors({
  origin: true, // Permite qualquer origem em desenvolvimento (celular/tablet)
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/configs', configRoutes);

// WebSocket handlers
setupWebSocket(io);

// Scheduler de alertas (roda a cada 5 minutos)
startAlertScheduler();

const PORT = process.env.PORT || 3001;
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na rede local na porta ${PORT}`);
  console.log(`📡 WebSocket ativo`);
});

export { io };
