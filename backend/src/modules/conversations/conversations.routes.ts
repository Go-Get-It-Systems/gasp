import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import { createConversationSchema, listConversationsSchema } from './conversations.schemas.js';
import * as conversationsService from './conversations.service.js';

export async function conversationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/conversations
  app.get('/', async (request) => {
    const { cursor, limit } = listConversationsSchema.parse(request.query);
    return conversationsService.listConversations(request.user.userId, cursor, limit);
  });

  // POST /api/v1/conversations
  app.post('/', async (request, reply) => {
    const { participantId } = createConversationSchema.parse(request.body);
    const conversation = await conversationsService.getOrCreateConversation(
      request.user.userId,
      participantId,
    );
    return reply.status(201).send(conversation);
  });

  // GET /api/v1/conversations/:id
  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return conversationsService.getConversationById(id, request.user.userId);
  });
}
