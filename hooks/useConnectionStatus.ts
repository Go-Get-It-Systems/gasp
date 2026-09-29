import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getSocket } from '@/services/socket';

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('online');

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener((state) => {
      if (!state.isConnected) {
        setStatus('offline');
        return;
      }
      const socket = getSocket();
      if (socket && !socket.connected) {
        setStatus('reconnecting');
      } else {
        setStatus('online');
      }
    });

    // Also listen for socket connect/disconnect
    const socket = getSocket();
    const handleConnect = () => setStatus('online');
    const handleDisconnect = () => {
      NetInfo.fetch().then((state) => {
        setStatus(state.isConnected ? 'reconnecting' : 'offline');
      });
    };

    socket?.on('connect', handleConnect);
    socket?.on('disconnect', handleDisconnect);

    return () => {
      unsubNet();
      socket?.off('connect', handleConnect);
      socket?.off('disconnect', handleDisconnect);
    };
  }, []);

  return status;
}
