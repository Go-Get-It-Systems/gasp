import { connectSocket, disconnectSocket, onSocketConnect } from '../socket';

const mockSocket = {
  connected: false,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

describe('onSocketConnect', () => {
  beforeEach(() => {
    disconnectSocket();
    jest.clearAllMocks();
    mockSocket.connected = false;
  });

  it('subscribes to reconnects and disposes the exact handler', () => {
    connectSocket('test-token');
    const handler = jest.fn();

    const cleanup = onSocketConnect(handler);

    expect(mockSocket.on).toHaveBeenCalledWith('connect', handler);

    cleanup();

    expect(mockSocket.off).toHaveBeenCalledWith('connect', handler);
  });
});
