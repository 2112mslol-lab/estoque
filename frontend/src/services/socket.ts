import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Na Vercel, usamos o mesmo endereço do site. Localmente, pegamos o IP.
    const isProd = import.meta.env.PROD;
    const host = window.location.hostname;
    
    // Se estivermos na internet, usamos o endereço do site sem porta.
    // Se estivermos no notebook, usamos a porta 3001.
    const socketUrl = isProd ? window.location.origin : `http://${host}:3001`;

    socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'] 
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
