import { describe, test, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { AppError } from '../../../shared/errors.js';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock env to prevent process.exit(1) during test environment (missing vars)
vi.mock('../../../config/env.js', () => ({
  env: {
    PORT: 3000,
    HOST: '0.0.0.0',
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test:test@localhost/test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret-at-least-16-chars',
    JWT_EXPIRES_IN: '24h',
    FIREBASE_PROJECT_ID: 'gasp-cab37',
    CORS_ORIGIN: '*',
    SENTRY_TRACES_SAMPLE_RATE: 0.2,
  },
}));

// Mock authMiddleware — bypass JWT verification in tests
vi.mock('../../auth/auth.middleware.js', () => ({
  authMiddleware: vi.fn(async (request: { user: unknown }) => {
    // Inject a fake authenticated user
    request.user = { userId: 'test-user-id', role: 'user' };
  }),
}));

// Mock createComposite service
const mockCreateComposite = vi.fn();
vi.mock('../composite.service.js', () => ({
  createComposite: (...args: unknown[]) => mockCreateComposite(...args),
}));

// ---------------------------------------------------------------------------
// Import route after mocks
// ---------------------------------------------------------------------------

import { compositeRoutes } from '../composite.routes.js';
import { ZodError } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildApp() {
  const app = Fastify({ logger: false });

  // Error handler MUST be set before plugin registration
  // Use duck-typing (statusCode/code properties) instead of instanceof to avoid
  // ESM module identity issues across test boundaries.
  app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, _req, reply) => {
    // AppError and FastifyError both carry statusCode + code
    if (typeof (error as { statusCode?: number }).statusCode === 'number') {
      const status = (error as { statusCode: number }).statusCode;
      const code = (error as { code?: string }).code ?? 'ERROR';

      if (status === 400 && code === 'FST_ERR_VALIDATION') {
        // Fastify's built-in validation error wrapper
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid request data' });
      }

      return reply.status(status).send({ error: code, message: error.message });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
      });
    }

    return reply.status(500).send({ error: 'INTERNAL_ERROR', message: error.message });
  });

  // Register rate limit plugin (required by messageRateLimit config)
  await app.register(import('@fastify/rate-limit'), {
    max: 1000,
    timeWindow: '1 minute',
  });

  await app.register(compositeRoutes, { prefix: '/reactions' });

  return app;
}

const validBody = {
  reactionVideoUrl: 'https://storage.googleapis.com/gasp-cab37.firebasestorage.app/reactions/u1/r.mp4',
  gaspUrl: 'https://storage.googleapis.com/gasp-cab37.firebasestorage.app/gasps/u2/g.mp4',
  layout: '1/3-2/3',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /reactions/composite', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  // -------------------------------------------------------------------------
  // Layout validation
  // -------------------------------------------------------------------------

  test('returns 400 missing_layout when layout field is absent', async () => {
    const { layout: _layout, ...bodyWithoutLayout } = validBody;

    const response = await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: bodyWithoutLayout,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<{ error: string; message: string }>();
    expect(body.error).toBe('missing_layout');
    expect(body.message).toBe('layout is required');
  });

  test('returns 400 missing_layout when layout is null', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: { ...validBody, layout: null },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>().error).toBe('missing_layout');
  });

  test('returns 400 unsupported_layout when layout is "full"', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: { ...validBody, layout: 'full' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<{ error: string; message: string }>();
    expect(body.error).toBe('unsupported_layout');
    expect(body.message).toContain('1/3-2/3');
  });

  test('returns 400 unsupported_layout when layout is "side-by-side"', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: { ...validBody, layout: 'side-by-side' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>().error).toBe('unsupported_layout');
  });

  // -------------------------------------------------------------------------
  // URL validation (Zod / isAllowedMediaUrl)
  // -------------------------------------------------------------------------

  test('returns 400 VALIDATION_ERROR when reactionVideoUrl is not from approved storage', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: {
        ...validBody,
        reactionVideoUrl: 'https://evil.com/reaction.mp4',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>().error).toBe('VALIDATION_ERROR');
  });

  test('returns 400 VALIDATION_ERROR when gaspUrl is not from approved storage', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: {
        ...validBody,
        gaspUrl: 'https://not-firebase.com/gasp.mp4',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>().error).toBe('VALIDATION_ERROR');
  });

  // -------------------------------------------------------------------------
  // Success path
  // -------------------------------------------------------------------------

  test('returns 200 with compositeUrl when service resolves', async () => {
    const expectedUrl = 'https://storage.googleapis.com/gasp-cab37.firebasestorage.app/composites/test-user-id/123_abc.mp4';
    mockCreateComposite.mockResolvedValueOnce({ compositeUrl: expectedUrl });

    const response = await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: validBody,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ compositeUrl: string }>();
    expect(body.compositeUrl).toBe(expectedUrl);
  });

  test('calls createComposite with reactorId from JWT user', async () => {
    mockCreateComposite.mockResolvedValueOnce({ compositeUrl: 'https://storage.googleapis.com/gasp-cab37.firebasestorage.app/composites/u/out.mp4' });

    await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: validBody,
    });

    expect(mockCreateComposite).toHaveBeenCalledWith(
      'test-user-id',
      expect.objectContaining({ layout: '1/3-2/3' }),
      expect.anything(), // logger
    );
  });

  // -------------------------------------------------------------------------
  // Error paths from service
  // -------------------------------------------------------------------------

  test('returns 422 when service throws unreachable_input', async () => {
    mockCreateComposite.mockRejectedValueOnce(
      new AppError(422, 'One or more input URLs could not be fetched', 'unreachable_input'),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: validBody,
    });

    expect(response.statusCode).toBe(422);
    expect(response.json<{ error: string }>().error).toBe('unreachable_input');
  });

  test('returns 422 when service throws invalid_media_type', async () => {
    mockCreateComposite.mockRejectedValueOnce(
      new AppError(422, 'Unsupported media type: text/plain', 'invalid_media_type'),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: validBody,
    });

    expect(response.statusCode).toBe(422);
    expect(response.json<{ error: string }>().error).toBe('invalid_media_type');
  });

  test('returns 500 when service throws COMPOSITE_FAILED', async () => {
    mockCreateComposite.mockRejectedValueOnce(
      new AppError(500, 'FFmpeg processing failed', 'COMPOSITE_FAILED'),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/reactions/composite',
      payload: validBody,
    });

    expect(response.statusCode).toBe(500);
    expect(response.json<{ error: string }>().error).toBe('COMPOSITE_FAILED');
  });
});
