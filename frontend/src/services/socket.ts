import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Pega o IP do notebook automaticamente
    const host = window.location.hostname;
    socket = io(`http://${host}:3001`, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('🔗 WebSocket conectado');
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
