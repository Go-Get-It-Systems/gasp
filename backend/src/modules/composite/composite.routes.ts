import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import { messageRateLimit } from '../../shared/rate-limit.js';
import {
  compositeSchema,
  SUPPORTED_LAYOUTS,
  type SupportedLayout,
} from './composite.schemas.js';
import { createComposite } from './composite.service.js';

export async function compositeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // POST /api/v1/reactions/composite
  app.post('/composite', messageRateLimit, async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    // Manual layout check before Zod so we return structured errors
    if (!('layout' in body) || body.layout === undefined || body.layout === null) {
      return reply.status(400).send({
        error: 'missing_layout',
        message: 'layout is required',
      });
    }

    if (!SUPPORTED_LAYOUTS.includes(body.layout as SupportedLayout)) {
      return reply.status(400).send({
        error: 'unsupported_layout',
        message: "Only layout '1/3-2/3' is supported",
      });
    }

    const input = compositeSchema.parse(body);

    const { compositeUrl } = await createComposite(
      request.user.userId,
      input,
      request.log,
    );

    return reply.send({ compositeUrl });
  });
}
