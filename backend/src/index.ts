// MUST be the first import: initializes Sentry before any other module is
// loaded so http/fastify can be auto-instrumented.
import './instrument.js';

import compress from '@fastify/compress';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { createSocketServer } from './config/socket.js';
import { scheduleRecurringJobs } from './jobs/queue.js';
import { startCleanupWorker } from './jobs/workers/cleanup.worker.js';
import { startGaspExpiryWorker } from './jobs/workers/gasp-expiry.worker.js';
import { startNotificationWorker } from './jobs/workers/notification.worker.js';
import { startWebhookWorker } from './jobs/workers/webhook.worker.js';
import { AppError } from './shared/errors.js';
import { setupSocketHandlers } from './socket/index.js';

// Route imports
import { authRoutes } from './modules/auth/auth.routes.js';
import { businessesRoutes } from './modules/businesses/businesses.routes.js';
import { compositeRoutes } from './modules/composite/composite.routes.js';
import { conversationsRoutes } from './modules/conversations/conversations.routes.js';
import { friendsRoutes } from './modules/friends/friends.routes.js';
import { gaspsRoutes } from './modules/gasps/gasps.routes.js';
import { messagesRoutes } from './modules/messages/messages.routes.js';
import { reactionsRoutes } from './modules/reactions/reactions.routes.js';
import { safetyRoutes } from './modules/safety/safety.routes.js';
import { uploadsRoutes } from './modules/uploads/uploads.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { webhooksRoutes } from './modules/webhooks/webhooks.routes.js';

async function main() {
  // Create Fastify instance
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // API-only, no HTML served
  });

  await app.register(compress);

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  await app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
      files: 1,
    },
  });

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return (request.user as { userId?: string })?.userId ?? request.ip;
    },
  });

  // Hook Sentry into Fastify. Captures unhandled exceptions and continues
  // distributed traces from sentry-trace headers sent by the RN client.
  Sentry.setupFastifyErrorHandler(app);

  // Global error handler
  app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        ...(env.NODE_ENV !== 'production' && { details: error.errors }),
      });
    }

    // Fastify rate limit error
    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: 'RATE_LIMIT',
        message: 'Too many requests',
      });
    }

    // Honor 4xx statusCodes from typed errors (FastifyError, multipart, etc.)
    // so clients see a meaningful status instead of a generic 500.
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: error.code ?? 'BAD_REQUEST',
        message: error.message,
      });
    }

    // Unexpected 5xx: log + capture in Sentry so we can investigate later.
    app.log.error(error);
    Sentry.captureException(error);
    return reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Register API routes
  await app.register(async (api) => {
    await api.register(authRoutes, { prefix: '/auth' });
    await api.register(usersRoutes, { prefix: '/users' });
    await api.register(friendsRoutes, { prefix: '/friends' });
    await api.register(conversationsRoutes, { prefix: '/conversations' });
    await api.register(messagesRoutes, { prefix: '/conversations' }); // Nested: /conversations/:id/messages
    await api.register(gaspsRoutes, { prefix: '/gasps' });
    await api.register(reactionsRoutes, { prefix: '/reactions' });
    await api.register(compositeRoutes, { prefix: '/reactions' });
    await api.register(webhooksRoutes, { prefix: '/webhooks' });
    await api.register(uploadsRoutes, { prefix: '/uploads' });
    await api.register(safetyRoutes, { prefix: '/safety' });
    await api.register(businessesRoutes, { prefix: '/businesses' });
  }, { prefix: '/api/v1' });

  // Start Fastify (get the HTTP server)
  await app.listen({ port: env.PORT, host: env.HOST });

  // Attach Socket.IO to the HTTP server
  const httpServer = app.server;
  const io = createSocketServer(httpServer);
  setupSocketHandlers(io);

  // Start BullMQ workers
  startNotificationWorker();
  startWebhookWorker();
  startGaspExpiryWorker();
  startCleanupWorker();

  // Schedule recurring jobs
  await scheduleRecurringJobs();

  app.log.info(`GASP Backend running on http://${env.HOST}:${env.PORT}`);
  app.log.info(`Socket.IO attached to the same port`);
  app.log.info(`Environment: ${env.NODE_ENV}`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
