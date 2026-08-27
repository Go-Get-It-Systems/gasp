import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import { sendGaspSchema, batchGaspSchema } from './gasps.schemas.js';
import * as gaspsService from './gasps.service.js';
import { batchGaspRateLimit } from '../../shared/rate-limit.js';
import { getIO } from '../../socket/index.js';
import { emitGaspReceived, emitGaspViewed, emitGaspOpened } from '../../socket/gasp.gateway.js';
import * as notificationsService from '../notifications/notifications.service.js';
import * as usersService from '../users/users.service.js';

export async function gaspsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // POST /api/v1/gasps
  app.post('/', async (request, reply) => {
    const input = sendGaspSchema.parse(request.body);
    const gasp = await gaspsService.sendGasp(request.user.userId, input);

    try {
      const sender = await usersService.getUserById(request.user.userId);
      emitGaspReceived(getIO(), input.recipientId, socketGasp(gasp, sender));
      await notificationsService.notifyGaspReceived(
        input.recipientId,
        sender?.displayName ?? 'Someone',
        gasp.id,
        request.user.userId,
        sender?.avatarUrl ?? undefined,
      );
    } catch { /* gasp already saved */ }

    return reply.status(201).send(gasp);
  });

  // POST /api/v1/gasps/batch
  app.post('/batch', batchGaspRateLimit, async (request, reply) => {
    const input = batchGaspSchema.parse(request.body);
    const gasps = await gaspsService.batchSendGasp(request.user.userId, input);

    try {
      const io = getIO();
      const sender = await usersService.getUserById(request.user.userId);
      for (const gasp of gasps) {
        emitGaspReceived(io, gasp.recipientId, socketGasp(gasp, sender));
        await notificationsService.notifyGaspReceived(
          gasp.recipientId,
          sender?.displayName ?? 'Someone',
          gasp.id,
          request.user.userId,
          sender?.avatarUrl ?? undefined,
        );
      }
    } catch { /* gasps already saved */ }

    return reply.status(201).send(gasps);
  });

  // GET /api/v1/gasps/pending
  app.get('/pending', async (request) => {
    return gaspsService.getPendingGasps(request.user.userId);
  });

  // GET /api/v1/gasps/sent
  app.get('/sent', async (request) => {
    return gaspsService.getSentGasps(request.user.userId);
  });

  // PATCH /api/v1/gasps/:id/open
  // Cliente chama ao abrir o gasp. Substitui o antigo /view.
  app.patch('/:id/open', async (request) => {
    const { id } = request.params as { id: string };
    const result = await gaspsService.openGasp(id, request.user.userId);

    if (result.status === 'opened' && result.openedAt) {
      try {
        emitGaspOpened(getIO(), result.senderId, id, result.openedAt);
      } catch { /* best effort */ }
    }

    return result;
  });

  // PATCH /api/v1/gasps/:id/close-view
  // Cliente chama quando a janela de reação fecha sem reação enviada.
  app.patch('/:id/close-view', async (request) => {
    const { id } = request.params as { id: string };
    const result = await gaspsService.closeViewGasp(id, request.user.userId);

    if (result.status === 'viewed' && result.viewedAt) {
      try {
        emitGaspViewed(getIO(), result.senderId, id, result.viewedAt);
      } catch { /* best effort */ }
    }

    return result;
  });

  // PATCH /api/v1/gasps/:id/view (DEPRECATED — compat com cliente antigo)
  app.patch('/:id/view', async (request) => {
    const { id } = request.params as { id: string };
    const result = await gaspsService.viewGasp(id, request.user.userId);

    if (result.status === 'viewed' && result.viewedAt) {
      try {
        emitGaspViewed(getIO(), result.senderId, id, result.viewedAt);
      } catch { /* best effort */ }
    }

    return result;
  });
}

function socketGasp(
  gasp: Awaited<ReturnType<typeof gaspsService.sendGasp>>,
  sender: Awaited<ReturnType<typeof usersService.getUserById>>,
) {
  return {
    ...gasp,
    senderName: sender?.displayName ?? 'Someone',
    senderAvatarUrl: sender?.avatarUrl ?? null,
    imageUri: gasp.imageUrl,
    mediaType: gasp.mediaType ?? 'image',
    blurhash: gasp.blurhash ?? '',
  };
}
