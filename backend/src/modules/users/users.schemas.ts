import { z } from 'zod';
import { isAllowedMediaUrl } from '../../shared/url-validator.js';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  avatarUrl: z.string().url().refine(isAllowedMediaUrl, 'URL must be from approved storage').nullish(),
  bio: z.string().max(200).optional(),
});

export const searchUsersSchema = z.object({
  q: z.string().min(1).max(50),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
