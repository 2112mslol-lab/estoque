import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../services/socket';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const subscribe = useCallback(<T>(event: string, callback: (data: T) => void) => {
    const socket = getSocket();
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, []);

  return { isConnected, subscribe };
}
