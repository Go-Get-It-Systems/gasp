import type { FastifyInstance } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware } from '../auth/auth.middleware.js';
import { createReactionSchema } from './reactions.schemas.js';
import * as reactionsService from './reactions.service.js';
import * as conversationsService from '../conversations/conversations.service.js';
import * as messagesService from '../messages/messages.service.js';
import { db } from '../../config/database.js';
import { messages } from '../../db/schema/messages.js';
import { getIO } from '../../socket/index.js';
import { emitReactionReceived } from '../../socket/gasp.gateway.js';
import { emitChatEventsToParticipants } from '../../socket/chat.events.js';
import * as usersService from '../users/users.service.js';
import * as notificationsService from '../notifications/notifications.service.js';

export async function reactionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // POST /api/v1/reactions
  app.post('/', async (request, reply) => {
    const input = createReactionSchema.parse(request.body);
    const userId = request.user.userId;
    const reaction = await reactionsService.createReaction(userId, input);

    // Get the gasp to find the sender
    const gasp = await reactionsService.getGasp(input.gaspId);

    if (gasp) {
      // Create a message in the conversation so the reaction appears in chat
      try {
        const conversation = await conversationsService.getOrCreateConversation(userId, gasp.senderId);

        // Find the original gasp message in this conversation to reply to it
        const gaspMessage = await db.select({ id: messages.id })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conversation.id),
              eq(messages.type, 'gasp'),
              eq(messages.mediaUrl, gasp.imageUrl),
            ),
          )
          .orderBy(desc(messages.createdAt))
          .limit(1)
          .then((rows) => rows[0]);

        const message = await messagesService.sendMessage(conversation.id, userId, {
          content: 'Sent a reaction',
          type: 'reaction',
          mediaUrl: input.videoUrl,
          replyToId: gaspMessage?.id,
        });
        const reactor = await usersService.getUserById(userId);

        // Deliver persisted chat activity to each participant, even outside the thread.
        const io = getIO();
        const chatEvent = {
          message,
          conversationId: conversation.id,
          actorName: reactor?.displayName ?? 'Someone',
          actorAvatarUrl: reactor?.avatarUrl ?? undefined,
        };
        const participants = await messagesService.getConversationParticipants(conversation.id);
        emitChatEventsToParticipants(io, participants.map((participant) => participant.userId), chatEvent);
        emitReactionReceived(io, gasp.senderId, reaction, input.gaspId, {
          conversationId: conversation.id,
          reactionMessageId: message.id,
          actorName: reactor?.displayName ?? 'Someone',
          actorAvatarUrl: reactor?.avatarUrl ?? undefined,
        });
        await notificationsService.notifyReactionReceived(
          gasp.senderId,
          reactor?.displayName ?? 'Someone',
          input.gaspId,
          userId,
          reaction.id,
          conversation.id,
          message.id,
          reactor?.avatarUrl ?? undefined,
        );
      } catch (err) {
        request.log.error(err, 'Failed to create chat message for reaction');
      }
    }

    return reply.status(201).send(reaction);
  });

  // GET /api/v1/gasps/:gaspId/reactions
  app.get('/gasps/:gaspId', async (request) => {
    const { gaspId } = request.params as { gaspId: string };
    return reactionsService.getReactionsForGasp(gaspId, request.user.userId);
  });
}
