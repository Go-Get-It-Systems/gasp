import { z } from 'zod';
import { isAllowedMediaUrl } from '../../shared/url-validator.js';

export const createReactionSchema = z.object({
  gaspId: z.string().min(1),
  videoUrl: z.string().url().refine(isAllowedMediaUrl, 'URL must be from approved storage'),
});

export type CreateReactionInput = z.infer<typeof createReactionSchema>;
