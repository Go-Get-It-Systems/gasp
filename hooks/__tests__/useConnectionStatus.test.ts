import { act, renderHook } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useConnectionStatus } from '../useConnectionStatus';

let mockConnection: 'idle' | 'connecting' | 'connected' = 'idle';
const mockSubscribers = new Set<() => void>();
jest.mock('@/services/socket', () => ({
  getSocketConnectionStatus: () => mockConnection,
  subscribeSocketConnection: (listener: () => void) => {
    mockSubscribers.add(listener);
    return () => { mockSubscribers.delete(listener); };
  },
}));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => jest.fn()) }));

function connection(state: typeof mockConnection) {
  act(() => { mockConnection = state; mockSubscribers.forEach((listener) => listener()); });
}

describe('connection banner', () => {
  beforeEach(() => { mockConnection = 'idle'; mockSubscribers.clear(); jest.clearAllMocks(); });

  it('tracks a socket created after mount and its reconnections', () => {
    const { result, unmount } = renderHook(useConnectionStatus);
    expect(result.current).toBe('online');
    connection('connecting');
    expect(result.current).toBe('reconnecting');
    connection('connected');
    expect(result.current).toBe('online');
    connection('connecting');
    expect(result.current).toBe('reconnecting');
    connection('connected');
    expect(result.current).toBe('online');
    connection('idle');
    expect(result.current).toBe('online');
    unmount();
    expect(mockSubscribers.size).toBe(0);
  });

  it('keeps offline separate and reads the current socket when the network returns', () => {
    const { result } = renderHook(useConnectionStatus);
    const changed = jest.mocked(NetInfo.addEventListener).mock.calls[0][0];
    act(() => changed({ isConnected: false } as Parameters<typeof changed>[0]));
    connection('connected');
    expect(result.current).toBe('offline');
    act(() => changed({ isConnected: true } as Parameters<typeof changed>[0]));
    expect(result.current).toBe('online');
  });
});
