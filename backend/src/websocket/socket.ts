import { Server, Socket } from 'socket.io';

let ioInstance: Server;

export function setupWebSocket(io: Server) {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`📱 Cliente conectado: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`📴 Cliente desconectado: ${socket.id}`);
    });

    // O cliente pode entrar em salas específicas
    socket.on('join:room', (room: string) => {
      socket.join(room);
    });
  });
}

// Emite evento para todos os clientes conectados
export function emitEvent(event: string, data: any) {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
}
