import { z } from 'zod';
import * as Sentry from '@sentry/react-native';

export function PaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  });
}

export type PaginatedResponse<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function validateResponse<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  Sentry.captureMessage(`API validation failed: ${context}`, {
    level: 'warning',
    extra: {
      errors: result.error.issues,
      data: JSON.stringify(data).slice(0, 500),
    },
  });

  return data as T;
}
