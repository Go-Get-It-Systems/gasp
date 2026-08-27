import { z } from 'zod';
import { isAllowedMediaUrl } from '../../shared/url-validator.js';

export const SUPPORTED_LAYOUTS = ['1/3-2/3'] as const;
export type SupportedLayout = (typeof SUPPORTED_LAYOUTS)[number];

export const compositeSchema = z.object({
  reactionVideoUrl: z
    .string()
    .url()
    .refine(isAllowedMediaUrl, 'URL must be from approved storage'),
  gaspUrl: z
    .string()
    .url()
    .refine(isAllowedMediaUrl, 'URL must be from approved storage'),
  layout: z.enum(SUPPORTED_LAYOUTS, {
    errorMap: (issue) => {
      if (issue.code === 'invalid_enum_value') {
        return { message: "Only layout '1/3-2/3' is supported" };
      }
      // invalid_type — field absent or wrong type
      return { message: 'layout is required' };
    },
  }),
});

export type CompositeInput = z.infer<typeof compositeSchema>;
