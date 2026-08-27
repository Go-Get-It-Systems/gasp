import { z } from 'zod';

export const createConversationSchema = z.object({
  participantId: z.string().min(1),
});

export const listConversationsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
