import { z } from 'zod';

export const ProductUpdateStatusSchema = z.enum([
  'released',
  'improved',
  'in_progress',
  'coming_soon',
]);

export const ProductUpdateContentSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  highlights: z.array(z.string().min(1)).max(3),
  actionLabel: z.string().min(1).optional(),
  mediaAlt: z.string().min(1).optional(),
});

export const ProductUpdateSchema = z.object({
  id: z.string().min(1),
  status: ProductUpdateStatusSchema,
  publishedAt: z.string().datetime(),
  content: z.object({
    'pt-BR': ProductUpdateContentSchema,
    en: ProductUpdateContentSchema,
  }),
  media: z.object({
    type: z.enum(['image', 'video']),
    uri: z.string().url(),
  }).optional(),
  actionRoute: z.string().startsWith('/').optional(),
  featured: z.boolean().optional(),
});

export const ProductUpdateCatalogSchema = z.array(ProductUpdateSchema);

export const ProductUpdateUserStateSchema = z.object({
  readUpdateIds: z.array(z.string()),
  feedbackByUpdateId: z.record(z.string(), z.boolean()),
});

export type ProductUpdateStatus = z.infer<typeof ProductUpdateStatusSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type ProductUpdateContent = z.infer<typeof ProductUpdateContentSchema>;
export type ProductUpdateUserState = z.infer<typeof ProductUpdateUserStateSchema>;
