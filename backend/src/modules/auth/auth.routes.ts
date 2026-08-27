import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema, registerDeviceSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';
import { authMiddleware } from './auth.middleware.js';
import { authRateLimit } from '../../shared/rate-limit.js';

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/register
  app.post('/register', authRateLimit, async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const user = await authService.registerUser(input);

    const token = app.jwt.sign(
      { userId: user.id, firebaseUid: user.firebaseUid },
    );

    return reply.status(201).send({ user, token });
  });

  // POST /api/v1/auth/login
  app.post('/login', authRateLimit, async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await authService.loginUser(input.firebaseToken);

    const token = app.jwt.sign(
      { userId: user.id, firebaseUid: user.firebaseUid },
    );

    return reply.send({ user, token });
  });

  // POST /api/v1/auth/refresh
  app.post('/refresh', { preHandler: [authMiddleware] }, async (request, reply) => {
    const token = app.jwt.sign({
      userId: request.user.userId,
      firebaseUid: request.user.firebaseUid,
    });

    return reply.send({ token });
  });

  // POST /api/v1/auth/devices
  app.post('/devices', { preHandler: [authMiddleware] }, async (request, reply) => {
    const input = registerDeviceSchema.parse(request.body);
    await authService.registerDevice(request.user.userId, input);
    return reply.status(201).send({ success: true });
  });

  // DELETE /api/v1/auth/devices/:token
  app.delete('/devices/:token', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { token } = request.params as { token: string };
    await authService.removeDevice(request.user.userId, token);
    return reply.send({ success: true });
  });

  // POST /api/v1/auth/logout
  app.post('/logout', { preHandler: [authMiddleware] }, async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) await authService.logoutUser(token);
    return reply.send({ success: true });
  });
}
