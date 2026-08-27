import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthPayload } from '../../shared/types.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthPayload;
    user: AuthPayload;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }

  const token = request.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const { isTokenBlacklisted } = await import('./auth.service.js');
    if (await isTokenBlacklisted(token)) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Token revoked' });
    }
  }
}
