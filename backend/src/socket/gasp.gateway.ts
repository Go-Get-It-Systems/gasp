import type { Server as SocketIOServer } from 'socket.io';

// Gasp events are emitted FROM the backend services, not from client socket events.
// This gateway sets up the server-side emit helpers.

export function registerGaspGateway(io: SocketIOServer) {
  // Gasp events are server-initiated, triggered by REST API calls.
  // The REST endpoints for gasps/reactions call these emitters.
}

// Emit functions called by REST API services
export function emitGaspReceived(io: SocketIOServer, recipientId: string, gasp: unknown) {
  io.to(`user:${recipientId}`).emit('gasp:received', { gasp });
}

export function emitGaspViewed(io: SocketIOServer, senderId: string, gaspId: string, viewedAt: Date) {
  io.to(`user:${senderId}`).emit('gasp:viewed', {
    gaspId,
    viewedAt: viewedAt.toISOString(),
  });
}

export function emitReactionReceived(
  io: SocketIOServer,
  senderId: string,
  reaction: unknown,
  gaspId: string,
  context: {
    conversationId: string;
    reactionMessageId: string;
    actorName: string;
    actorAvatarUrl?: string;
  },
) {
  io.to(`user:${senderId}`).emit('gasp:reaction_received', {
    reaction,
    gaspId,
    ...context,
  });
}

export function emitGaspExpired(io: SocketIOServer, recipientId: string, gaspId: string) {
  io.to(`user:${recipientId}`).emit('gasp:expired', { gaspId });
}

export function emitGaspOpened(io: SocketIOServer, senderId: string, gaspId: string, openedAt: Date) {
  io.to(`user:${senderId}`).emit('gasp:opened', {
    gaspId,
    openedAt: openedAt.toISOString(),
  });
}
