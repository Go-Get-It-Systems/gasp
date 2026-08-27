import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/auth.middleware.js';
import { updateProfileSchema, searchUsersSchema } from './users.schemas.js';
import * as usersService from './users.service.js';

export async function usersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // GET /api/v1/users/me
  app.get('/me', async (request) => {
    return usersService.getProfile(request.user.userId);
  });

  // GET /api/v1/users/me/stats
  app.get('/me/stats', async (request) => {
    return usersService.getExtendedStats(request.user.userId, request.user.userId);
  });

  // PATCH /api/v1/users/me
  app.patch('/me', async (request) => {
    const input = updateProfileSchema.parse(request.body);
    return usersService.updateProfile(request.user.userId, input);
  });

  // GET /api/v1/users/search?q=
  app.get('/search', async (request) => {
    const { q } = searchUsersSchema.parse(request.query);
    return usersService.searchUsers(q, request.user.userId);
  });

  // GET /api/v1/users/recommended
  app.get('/recommended', async (request) => {
    const excludeIds = await usersService.getTopGasperIds(request.user.userId);
    return usersService.getRecommendedUsers(request.user.userId, excludeIds);
  });

  // GET /api/v1/users/top-gaspers
  app.get('/top-gaspers', async (request) => {
    return usersService.getTopGaspers(request.user.userId);
  });

  // GET /api/v1/users/:id/stats
  app.get('/:id/stats', async (request) => {
    const { id } = request.params as { id: string };
    return usersService.getExtendedStats(id, request.user.userId);
  });

  // GET /api/v1/users/:id
  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return usersService.getUserById(id, request.user.userId);
  });
}
