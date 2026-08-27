import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('24h'),

  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.2),

  // Business Studio (all default to disabled / safe-off)
  BUSINESS_STUDIO_ENABLED: z
    .string()
    .toLowerCase()
    .pipe(z.enum(['true', 'false']))
    .transform((v) => v === 'true')
    .default('false'),
  // Comma-separated workspace IDs allowed into Studio even when flag is off
  BUSINESS_STUDIO_ALLOWED_WORKSPACE_IDS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  // 0 is valid: prevents delivery without disabling the feature (R6.2)
  BUSINESS_STUDIO_FOLLOWER_CAP: z.coerce.number().int().min(0).default(20),
  BUSINESS_STUDIO_CAMPAIGNS_PER_DAY: z.coerce.number().int().min(1).default(1),
  BUSINESS_STUDIO_FANOUT_CHUNK_SIZE: z.coerce.number().int().min(1).default(20),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
