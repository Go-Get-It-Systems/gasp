import { z } from 'zod';

export const reportTargetTypeSchema = z.enum(['profile', 'message', 'gasp']);
export const reportCategorySchema = z.enum([
  'spam',
  'harassment',
  'hate_speech',
  'nudity_or_sexual_content',
  'violence_or_threats',
  'impersonation',
  'other',
]);

export const reportSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().min(1).max(128),
  category: reportCategorySchema,
  description: z.string().trim().min(1).max(1000).optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;
