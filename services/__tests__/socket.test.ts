import { connectSocket, disconnectSocket, suspendSocket, onSocketConnect, onGaspReceived, getSocket } from '../socket';
import { advanceSession } from '../session';
import { io } from 'socket.io-client';

const mockSocket = {
  connected: false,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
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

  it('does not create parallel sockets when connection is still pending', () => {
    connectSocket('test-token');
    connectSocket('test-token');
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('keeps gasp listeners across a background/foreground cycle', () => {
    connectSocket('test-token');
    const received = jest.fn();
    onGaspReceived(received);
    const handler = mockSocket.on.mock.calls.find(([event]) => event === 'gasp:received')![1];
    suspendSocket();
    expect(mockSocket.removeAllListeners).not.toHaveBeenCalled();
    expect(getSocket()).toBe(mockSocket);
    connectSocket('test-token');
    expect(io).toHaveBeenCalledTimes(1);
    expect(mockSocket.connect).toHaveBeenCalled();
    const data = { gasp: { id: 'test-gasp', senderId: 'sender' } };
    handler(data);
    expect(received).toHaveBeenCalledWith(data);
  });

  it('disposes the previous connection when the login lifetime changes', () => {
    connectSocket('old-token');
    advanceSession();
    const replacement = { ...mockSocket, off: jest.fn() };
    jest.mocked(io).mockReturnValueOnce(replacement as unknown as ReturnType<typeof io>);
    connectSocket('new-token');
    expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(getSocket()).toBe(replacement);
  });

  it('disposes a listener on its original socket after the singleton changes', () => {
    connectSocket('test-token');
    const handler = jest.fn();
    const cleanup = onSocketConnect(handler);
    disconnectSocket();
    const replacement = { ...mockSocket, off: jest.fn() };
    jest.mocked(io).mockReturnValueOnce(replacement as unknown as ReturnType<typeof io>);
    connectSocket('next-token');
    cleanup();
    expect(mockSocket.off).toHaveBeenCalledWith('connect', handler);
    expect(replacement.off).not.toHaveBeenCalled();
  });
});
