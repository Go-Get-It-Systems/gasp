import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import { reportSchema } from './safety.schemas.js';
import * as safetyService from './safety.service.js';

export async function safetyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/blocks', async (request) => {
    return safetyService.listBlockedUsers(request.user.userId);
  });

  app.post('/blocks/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const result = await safetyService.blockUser(request.user.userId, userId);
    return reply.status(result.alreadyBlocked ? 200 : 201).send(result.block);
  });

  app.delete('/blocks/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    await safetyService.unblockUser(request.user.userId, userId);
    return reply.status(204).send();
  });

  app.post('/reports', async (request, reply) => {
    const input = reportSchema.parse(request.body);
    const report = await safetyService.submitReport(request.user.userId, input);
    return reply.status(201).send(report);
  });
}
