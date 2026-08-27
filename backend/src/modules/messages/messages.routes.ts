import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import { sendMessageSchema, listMessagesSchema } from './messages.schemas.js';
import * as messagesService from './messages.service.js';
import * as notificationsService from '../notifications/notifications.service.js';
import * as usersService from '../users/users.service.js';
import { messageRateLimit } from '../../shared/rate-limit.js';
import { getIO } from '../../socket/index.js';
import { emitChatEventsToParticipants } from '../../socket/chat.events.js';

export async function messagesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/conversations/:conversationId/messages
  app.get('/:conversationId/messages', async (request) => {
    const { conversationId } = request.params as { conversationId: string };
    const { cursor, limit, direction } = listMessagesSchema.parse(request.query);
    return messagesService.listMessages(
      conversationId,
      request.user.userId,
      cursor,
      limit,
      direction,
    );
  });

  // POST /api/v1/conversations/:conversationId/messages
  app.post('/:conversationId/messages', messageRateLimit, async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };
    const input = sendMessageSchema.parse(request.body);
    const message = await messagesService.sendMessage(
      conversationId,
      request.user.userId,
      input,
    );

    try {
      const sender = await usersService.getUserById(request.user.userId);
      const participants = await messagesService.getConversationParticipants(conversationId);
      const recipients = messagesService.selectMessageNotificationRecipients(
        participants,
        request.user.userId,
      );

      try {
        emitChatEventsToParticipants(
          getIO(),
          participants.map((participant) => participant.userId),
          {
            message,
            conversationId,
            actorName: sender?.displayName ?? 'Someone',
            actorAvatarUrl: sender?.avatarUrl ?? undefined,
          },
        );
      } catch {
        request.log.warn({ conversationId, messageId: message.id }, 'Failed to emit REST chat events');
      }

      await Promise.all(recipients.map((recipient) =>
        notificationsService.notifyNewMessage(
          recipient.userId,
          sender?.displayName ?? 'Someone',
          message.content,
          conversationId,
          request.user.userId,
          message.id,
          sender?.avatarUrl ?? undefined,
        ),
      ));
    } catch {
      request.log.warn({ conversationId, messageId: message.id }, 'Failed to notify message recipients');
    }

    return reply.status(201).send(message);
  });

  // PATCH /api/v1/conversations/:conversationId/read
  app.patch('/:conversationId/read', async (request) => {
    const { conversationId } = request.params as { conversationId: string };
    return messagesService.markConversationRead(conversationId, request.user.userId);
  });
}
