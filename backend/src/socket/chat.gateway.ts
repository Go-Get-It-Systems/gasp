import type { Server as SocketIOServer, Socket } from 'socket.io';
import { eq } from 'drizzle-orm';
import { redis } from '../config/redis.js';
import { db } from '../config/database.js';
import { users } from '../db/schema/users.js';
import * as messagesService from '../modules/messages/messages.service.js';
import * as notificationsService from '../modules/notifications/notifications.service.js';
import { sendMessageSchema } from '../modules/messages/messages.schemas.js';
import { emitChatEventsToParticipants } from './chat.events.js';

interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'gasp' | 'reaction';
  mediaUrl?: string;
  replyToId?: string;
}

interface TypingPayload {
  conversationId: string;
}

interface MarkReadPayload {
  conversationId: string;
  messageId?: string;
}

export function registerChatGateway(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    // Join user to their personal room for targeted messages
    const userId = socket.user.userId;
    socket.join(`user:${userId}`);

    // Send message
    socket.on('chat:send_message', async (payload: SendMessagePayload) => {
      try {
        const input = sendMessageSchema.parse({
          content: payload.content,
          type: payload.type ?? 'text',
          mediaUrl: payload.mediaUrl,
          replyToId: payload.replyToId,
        });

        const message = await messagesService.sendMessage(
          payload.conversationId,
          userId,
          input,
        );
        const sender = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        const participants = await messagesService.getConversationParticipants(payload.conversationId);
        const chatEvent = {
          message,
          conversationId: payload.conversationId,
          actorName: sender?.displayName ?? 'Someone',
          actorAvatarUrl: sender?.avatarUrl ?? undefined,
        };

        emitChatEventsToParticipants(io, participants.map((participant) => participant.userId), chatEvent);

        if (notificationsService.shouldNotifyAsMessage(message.type)) {
          try {
            const recipients = messagesService.selectMessageNotificationRecipients(participants, userId);

            await Promise.all(recipients.map((recipient) =>
              notificationsService.notifyNewMessage(
                recipient.userId,
                sender?.displayName ?? 'Someone',
                message.content,
                payload.conversationId,
                userId,
                message.id,
                sender?.avatarUrl ?? undefined,
              ),
            ));
          } catch (err) {
            console.error('[chat] failed to notify message recipients', err);
          }
        }
      } catch (err) {
        socket.emit('chat:error', {
          event: 'send_message',
          message: err instanceof Error ? err.message : 'Failed to send message',
        });
      }
    });

    // Typing start
    socket.on('chat:typing_start', async (payload: TypingPayload) => {
      try {
        await messagesService.assertConversationAvailable(payload.conversationId, userId, true);
        await redis.set(`typing:${payload.conversationId}:${userId}`, '1', 'EX', 5);
        socket.to(`conversation:${payload.conversationId}`).emit('chat:typing', {
          conversationId: payload.conversationId,
          userId,
          isTyping: true,
        });
      } catch (err) {
        socket.emit('chat:error', {
          event: 'typing_start',
          message: err instanceof Error ? err.message : 'Failed to send typing indicator',
        });
      }
    });

    // Typing stop
    socket.on('chat:typing_stop', async (payload: TypingPayload) => {
      try {
        await messagesService.assertConversationAvailable(payload.conversationId, userId, true);
        await redis.del(`typing:${payload.conversationId}:${userId}`);
        socket.to(`conversation:${payload.conversationId}`).emit('chat:typing', {
          conversationId: payload.conversationId,
          userId,
          isTyping: false,
        });
      } catch (err) {
        socket.emit('chat:error', {
          event: 'typing_stop',
          message: err instanceof Error ? err.message : 'Failed to send typing indicator',
        });
      }
    });

    // Mark read
    socket.on('chat:mark_read', async (payload: MarkReadPayload) => {
      try {
        await messagesService.markConversationRead(payload.conversationId, userId);

        socket.to(`conversation:${payload.conversationId}`).emit('chat:message_read', {
          conversationId: payload.conversationId,
          userId,
          readAt: new Date().toISOString(),
        });
      } catch (err) {
        socket.emit('chat:error', {
          event: 'mark_read',
          message: err instanceof Error ? err.message : 'Failed to mark as read',
        });
      }
    });

    // Join conversation rooms (with authorization check)
    socket.on('chat:join_conversation', async (conversationId: string) => {
      try {
        await messagesService.assertConversationAvailable(conversationId, userId);

        socket.join(`conversation:${conversationId}`);
      } catch (err) {
        socket.emit('chat:error', {
          event: 'join_conversation',
          message: err instanceof Error ? err.message : 'Failed to join conversation',
        });
      }
    });

    socket.on('chat:leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });
  });
}
