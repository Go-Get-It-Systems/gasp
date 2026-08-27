import { beforeEach, describe, expect, test, vi } from 'vitest';
import Fastify from 'fastify';

vi.mock('../auth/auth.middleware.js', () => ({
  authMiddleware: vi.fn(async (request: { user: unknown }) => {
    request.user = { userId: 'actor-1', role: 'user' };
  }),
}));

const mockBlockUser = vi.fn();
const mockUnblockUser = vi.fn();
const mockListBlockedUsers = vi.fn();
const mockSubmitReport = vi.fn();
vi.mock('./safety.service.js', () => ({
  blockUser: (...args: unknown[]) => mockBlockUser(...args),
  unblockUser: (...args: unknown[]) => mockUnblockUser(...args),
  listBlockedUsers: (...args: unknown[]) => mockListBlockedUsers(...args),
  submitReport: (...args: unknown[]) => mockSubmitReport(...args),
}));

import { safetyRoutes } from './safety.routes.js';

describe('safety routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBlockUser.mockResolvedValue({
      block: { id: 'block-1', blockerId: 'actor-1', blockedId: 'user-2' },
      alreadyBlocked: false,
    });
    mockUnblockUser.mockResolvedValue(undefined);
    mockListBlockedUsers.mockResolvedValue([]);
    mockSubmitReport.mockResolvedValue({ id: 'report-1', status: 'pending' });
  });

  test('uses the authenticated user when blocking and never accepts an actor from the request', async () => {
    const app = Fastify({ logger: false });
    await app.register(safetyRoutes, { prefix: '/safety' });

    const response = await app.inject({ method: 'POST', url: '/safety/blocks/user-2' });

    expect(response.statusCode).toBe(201);
    expect(mockBlockUser).toHaveBeenCalledWith('actor-1', 'user-2');
    await app.close();
  });

  test('validates report input and submits it as the authenticated user', async () => {
    const app = Fastify({ logger: false });
    await app.register(safetyRoutes, { prefix: '/safety' });

    const response = await app.inject({
      method: 'POST',
      url: '/safety/reports',
      payload: {
        targetType: 'profile',
        targetId: 'user-2',
        category: 'harassment',
        description: 'Unwanted contact',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(mockSubmitReport).toHaveBeenCalledWith('actor-1', expect.objectContaining({
      targetType: 'profile', targetId: 'user-2', category: 'harassment',
    }));
    await app.close();
  });
});
