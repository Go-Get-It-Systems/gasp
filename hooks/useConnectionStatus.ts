import { useState, useEffect, useSyncExternalStore } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getSocketConnectionStatus, subscribeSocketConnection } from '@/services/socket';

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

export function useConnectionStatus(): ConnectionStatus {
  const [networkConnected, setNetworkConnected] = useState(true);
  const connection = useSyncExternalStore(subscribeSocketConnection, getSocketConnectionStatus, getSocketConnectionStatus);

  useEffect(() => NetInfo.addEventListener((state) => {
    setNetworkConnected(state.isConnected !== false);
  }), []);

  if (!networkConnected) return 'offline';
  return connection === 'connecting' ? 'reconnecting' : 'online';
}
