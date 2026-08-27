/**
 * Sentry instrumentation. Must be imported as the very first thing in the app
 * (before Fastify, http, etc.) so the SDK can monkey-patch modules to enable
 * automatic instrumentation and distributed tracing.
 *
 * The DSN is read directly from process.env to avoid pulling in any other
 * module before instrumentation is set up.
 */
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.2'),

    // Auto-instruments http, fastify, and other Node integrations.
    // Trace headers (sentry-trace, baggage) sent by the React Native client
    // are picked up automatically and link the client and server traces.
  });
}
