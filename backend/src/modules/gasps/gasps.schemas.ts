import { z } from 'zod';
import { isAllowedMediaUrl } from '../../shared/url-validator.js';

export const sendGaspSchema = z.object({
  recipientId: z.string().min(1),
  imageUrl: z.string().url().refine(isAllowedMediaUrl, 'URL must be from approved storage'),
  mediaType: z.enum(['image', 'video']).default('image'),
  blurhash: z.string().optional(),
  textOverlay: z.string().max(1000).optional(),
  replayable: z.boolean().default(false),
});

export const batchGaspSchema = z.object({
  recipientIds: z.array(z.string().min(1)).min(1).max(50),
  imageUrl: z.string().url().refine(isAllowedMediaUrl, 'URL must be from approved storage'),
  mediaType: z.enum(['image', 'video']).default('image'),
  blurhash: z.string().optional(),
  textOverlay: z.string().max(1000).optional(),
  replayable: z.boolean().default(false),
});

export type SendGaspInput = z.infer<typeof sendGaspSchema>;
export type BatchGaspInput = z.infer<typeof batchGaspSchema>;
