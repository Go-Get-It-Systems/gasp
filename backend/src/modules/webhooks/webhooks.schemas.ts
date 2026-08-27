import { z } from 'zod';
import type { WebhookEventType } from '../../shared/types.js';

const validEvents: WebhookEventType[] = [
  'user.registered',
  'user.updated',
  'message.created',
  'gasp.sent',
  'gasp.viewed',
  'gasp.expired',
  'reaction.created',
  'friend.requested',
  'friend.accepted',
];

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(validEvents as [string, ...string[]])).min(1),
  description: z.string().max(200).optional(),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(validEvents as [string, ...string[]])).min(1).optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(200).optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
