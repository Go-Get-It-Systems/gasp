import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import { createWebhookSchema, updateWebhookSchema } from './webhooks.schemas.js';
import * as webhooksService from './webhooks.service.js';

export async function webhooksRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // POST /api/v1/webhooks
  app.post('/', async (request, reply) => {
    const input = createWebhookSchema.parse(request.body);
    const subscription = await webhooksService.createSubscription(request.user.userId, input);
    return reply.status(201).send(subscription);
  });

  // GET /api/v1/webhooks
  app.get('/', async (request) => {
    return webhooksService.listSubscriptions(request.user.userId);
  });

  // PATCH /api/v1/webhooks/:id
  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const input = updateWebhookSchema.parse(request.body);
    return webhooksService.updateSubscription(request.user.userId, id, input);
  });

  // DELETE /api/v1/webhooks/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await webhooksService.deleteSubscription(request.user.userId, id);
    return reply.send({ success: true });
  });

  // GET /api/v1/webhooks/:id/events
  app.get('/:id/events', async (request) => {
    const { id } = request.params as { id: string };
    return webhooksService.getEventHistory(request.user.userId, id);
  });

  // POST /api/v1/webhooks/:id/test
  app.post('/:id/test', async (request) => {
    const { id } = request.params as { id: string };
    // Verify subscription exists and user owns it before dispatching test event
    await webhooksService.getSubscription(request.user.userId, id);
    await webhooksService.emitWebhookEvent('user.registered', {
      test: true,
      message: 'This is a test webhook delivery',
      timestamp: new Date().toISOString(),
    });
    return { success: true, message: 'Test event dispatched' };
  });
}
