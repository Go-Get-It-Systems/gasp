import { z } from 'zod';
import { PaginatedResponseSchema } from './common.schema';

export const BusinessWorkspaceSchema = z.object({ id: z.string(), handle: z.string(), displayName: z.string(), avatarUrl: z.string().nullable(), bio: z.string(), verificationStatus: z.string(), role: z.string().optional(), followerCount: z.number().optional(), isFollowing: z.boolean().optional() });
export const CampaignCountsSchema = z.object({ queued: z.number(), delivered: z.number(), failed: z.number(), opened: z.number(), reacted: z.number(), selected: z.number() });
export const BusinessCampaignSchema = z.object({ id: z.string(), workspaceId: z.string(), ownerUserId: z.string(), title: z.string(), mediaUrl: z.string(), mediaType: z.enum(['image', 'video']), blurhash: z.string().nullable(), textOverlay: z.string().nullable(), replayable: z.boolean(), state: z.enum(['draft', 'publishing', 'live', 'failed', 'closed']), audienceSnapshotCount: z.number(), createdAt: z.string(), publishedAt: z.string().nullable(), counts: CampaignCountsSchema.optional() });
export const BusinessOverviewSchema = z.object({ followerCount: z.number(), activeCampaign: BusinessCampaignSchema.nullable() });
export const CampaignReactionSchema = z.object({ id: z.string(), videoUrl: z.string(), createdAt: z.string(), actor: z.object({ id: z.string(), displayName: z.string(), avatarUrl: z.string().nullable() }), selected: z.boolean() });
export const CampaignReactionPageSchema = PaginatedResponseSchema(CampaignReactionSchema);
export type BusinessWorkspace = z.infer<typeof BusinessWorkspaceSchema>;
export type BusinessCampaign = z.infer<typeof BusinessCampaignSchema>;
export type BusinessOverview = z.infer<typeof BusinessOverviewSchema>;
export type CampaignReaction = z.infer<typeof CampaignReactionSchema>;
