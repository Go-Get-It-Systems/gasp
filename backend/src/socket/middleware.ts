import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import type { AuthPayload } from '../shared/types.js';

declare module 'socket.io' {
  interface Socket {
    user: AuthPayload;
  }
}

export async function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    // We use jsonwebtoken directly here since @fastify/jwt is only available in HTTP context
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    const isBlacklisted = await redis.exists(`blacklist:${token}`);
    if (isBlacklisted) return next(new Error('Token revoked'));

    socket.user = payload;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}
