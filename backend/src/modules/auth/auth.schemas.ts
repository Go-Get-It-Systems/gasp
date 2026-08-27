import { z } from 'zod';

export const registerSchema = z.object({
  firebaseToken: z.string().min(1),
  displayName: z.string().min(1).max(50),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  accountType: z.enum(['personal', 'business']).optional().default('personal'),
});

export const loginSchema = z.object({
  firebaseToken: z.string().min(1),
});

export const registerDeviceSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  deviceId: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
