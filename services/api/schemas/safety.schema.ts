import { z } from 'zod';

export const ReportTargetTypeSchema = z.enum(['profile', 'message', 'gasp']);
export type ReportTargetType = z.infer<typeof ReportTargetTypeSchema>;

export const ReportCategorySchema = z.enum([
  'spam',
  'harassment',
  'hate_speech',
  'nudity_or_sexual_content',
  'violence_or_threats',
  'impersonation',
  'other',
]);
export type ReportCategory = z.infer<typeof ReportCategorySchema>;

export const SubmitReportInputSchema = z.object({
  targetType: ReportTargetTypeSchema,
  targetId: z.string().min(1),
  category: ReportCategorySchema,
  description: z.string().trim().min(1).max(1000).optional(),
});
export type SubmitReportInput = z.infer<typeof SubmitReportInputSchema>;

export const BlockedUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  blockedAt: z.string(),
});
export type BlockedUser = z.infer<typeof BlockedUserSchema>;
