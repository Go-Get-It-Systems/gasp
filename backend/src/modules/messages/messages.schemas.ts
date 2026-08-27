import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'image', 'gasp', 'reaction']).default('text'),
  mediaUrl: z.string().url().optional(),
  replyToId: z.string().max(30).optional(),
});

export const listMessagesSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  direction: z.enum(['older', 'newer']).default('older'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
