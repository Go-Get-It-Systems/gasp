import type { FastifyInstance } from 'fastify';

export function configureRateLimit(app: FastifyInstance) {
  // Global rate limit: 100 requests per minute
  app.register(import('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return (request.user as { userId?: string })?.userId ?? request.ip;
    },
  });
}

// Route-specific rate limit configs
export const authRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
    },
  },
};

export const messageRateLimit = {
  config: {
    rateLimit: {
      max: 30,
      timeWindow: '1 minute',
    },
  },
};

export const batchGaspRateLimit = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute',
    },
  },
};
