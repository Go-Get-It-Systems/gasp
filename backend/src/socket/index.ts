import type { Server as SocketIOServer } from 'socket.io';
import { socketAuthMiddleware } from './middleware.js';
import { registerChatGateway } from './chat.gateway.js';
import { registerPresenceGateway } from './presence.gateway.js';
import { registerGaspGateway } from './gasp.gateway.js';

let _io: SocketIOServer | null = null;

export function getIO(): SocketIOServer {
  if (!_io) throw new Error('Socket.IO not initialized');
  return _io;
}

export function setupSocketHandlers(io: SocketIOServer) {
  _io = io;
  // Apply authentication middleware to all connections
  io.use(socketAuthMiddleware);

  // Register gateways
  registerChatGateway(io);
  registerPresenceGateway(io);
  registerGaspGateway(io);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.user.userId})`);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (reason: ${reason})`);
    });
  });
}
