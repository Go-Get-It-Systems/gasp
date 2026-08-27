import { z } from 'zod';

export const FriendRequestRequesterSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});

export const FriendRequestSchema = z.object({
  friendshipId: z.string(),
  requester: FriendRequestRequesterSchema,
  createdAt: z.string(),
});

export type FriendRequest = z.infer<typeof FriendRequestSchema>;
