import { z } from 'zod';

export const friendRequestSchema = z.object({
  addresseeId: z.string().min(1),
});

export const friendActionSchema = z.object({
  friendshipId: z.string().min(1),
});

export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
export type FriendActionInput = z.infer<typeof friendActionSchema>;
