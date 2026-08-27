import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import { friendRequestSchema, friendActionSchema } from './friends.schemas.js';
import * as friendsService from './friends.service.js';
import * as notificationsService from '../notifications/notifications.service.js';
import * as usersService from '../users/users.service.js';

export async function friendsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/friends
  app.get('/', async (request) => {
    return friendsService.listFriends(request.user.userId);
  });

  // GET /api/v1/friends/requests
  app.get('/requests', async (request) => {
    return friendsService.getPendingRequests(request.user.userId);
  });

  // POST /api/v1/friends/request
  app.post('/request', async (request, reply) => {
    const { addresseeId } = friendRequestSchema.parse(request.body);
    const friendship = await friendsService.sendFriendRequest(request.user.userId, addresseeId);

    // Push notification (best effort)
    try {
      const requester = await usersService.getUserById(request.user.userId);
      await notificationsService.notifyFriendRequest(
        addresseeId,
        requester?.displayName ?? 'Someone',
        request.user.userId,
        friendship.id,
        requester?.avatarUrl ?? undefined,
      );
    } catch { /* friendship already saved */ }

    return reply.status(201).send(friendship);
  });

  // POST /api/v1/friends/accept
  app.post('/accept', async (request) => {
    const { friendshipId } = friendActionSchema.parse(request.body);
    const result = await friendsService.acceptFriendRequest(request.user.userId, friendshipId);

    // Notify the original requester (best effort)
    try {
      const accepter = await usersService.getUserById(request.user.userId);
      await notificationsService.notifyFriendAccepted(
        result.requesterId,
        accepter?.displayName ?? 'Someone',
        request.user.userId,
        result.id,
        accepter?.avatarUrl ?? undefined,
      );
    } catch { /* acceptance already saved */ }

    return result;
  });

  // POST /api/v1/friends/reject
  app.post('/reject', async (request, reply) => {
    const { friendshipId } = friendActionSchema.parse(request.body);
    await friendsService.rejectFriendRequest(request.user.userId, friendshipId);
    return reply.send({ success: true });
  });

  // DELETE /api/v1/friends/:friendshipId
  app.delete('/:friendshipId', async (request, reply) => {
    const { friendshipId } = request.params as { friendshipId: string };
    await friendsService.removeFriend(request.user.userId, friendshipId);
    return reply.send({ success: true });
  });
}
