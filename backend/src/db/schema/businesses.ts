/**
 * Business Broadcast schema — additive tables that sit alongside the existing
 * personal-user schema without modifying any existing tables.
 *
 * Tables:
 *  - business_workspaces     : the brand identity entity
 *  - business_members        : owner membership (admin-provisioned)
 *  - business_followers      : explicit opt-in audience
 *  - business_campaigns      : media broadcast drafts and lifecycle
 *  - campaign_deliveries     : per-follower delivery tracking
 */
import { createId } from '@paralleldrive/cuid2';
import { boolean, index, integer, pgEnum, pgTable, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

// ─── Campaign state enum ─────────────────────────────────────────────────────

export const campaignStateEnum = pgEnum('campaign_state', [
  'draft',
  'publishing',
  'live',
  'failed',
  'closed',
]);
export type CampaignState = typeof campaignStateEnum.enumValues[number];

// ─── Delivery status enum ────────────────────────────────────────────────────

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'queued',
  'delivered',
  'failed',
  'opened',
  'viewed',
]);
export type DeliveryStatus = typeof deliveryStatusEnum.enumValues[number];

// ─── business_workspaces ─────────────────────────────────────────────────────

export const businessWorkspaces = pgTable('business_workspaces', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  handle: varchar('handle', { length: 30 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  isVerified: boolean('is_verified').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  followerCount: integer('follower_count').notNull().default(0),
  followingCount: integer('following_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('bw_handle_idx').on(table.handle),
  index('bw_active_idx').on(table.isActive),
]);

export type BusinessWorkspace = typeof businessWorkspaces.$inferSelect;
export type NewBusinessWorkspace = typeof businessWorkspaces.$inferInsert;

// ─── business_members ────────────────────────────────────────────────────────

export const businessMembers = pgTable('business_members', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => businessWorkspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().default('owner'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('bm_workspace_user_unique').on(table.workspaceId, table.userId),
  index('bm_user_idx').on(table.userId),
  index('bm_workspace_idx').on(table.workspaceId),
]);

export type BusinessMember = typeof businessMembers.$inferSelect;

// ─── business_followers ──────────────────────────────────────────────────────

export const businessFollowers = pgTable('business_followers', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => businessWorkspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // followerType: 'user' = personal/business user; 'workspace' = business following another business
  followerType: varchar('follower_type', { length: 10 }).notNull().default('user'),
  // R2.5: these three flags stored as concrete columns, never derived on the fly
  explicit: boolean('explicit').notNull().default(false),
  idempotent: boolean('idempotent').notNull().default(true),
  independent: boolean('independent').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('bf_workspace_user_unique').on(table.workspaceId, table.userId),
  index('bf_workspace_idx').on(table.workspaceId),
  index('bf_user_idx').on(table.userId),
]);

export type BusinessFollower = typeof businessFollowers.$inferSelect;

// ─── business_campaigns ──────────────────────────────────────────────────────

export const businessCampaigns = pgTable('business_campaigns', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => businessWorkspaces.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  mediaUrl: text('media_url').notNull(),
  textOverlay: varchar('text_overlay', { length: 200 }),
  isReplayable: boolean('is_replayable').notNull().default(false),
  state: campaignStateEnum('state').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('bc_workspace_idx').on(table.workspaceId),
  index('bc_state_idx').on(table.state),
  index('bc_workspace_state_idx').on(table.workspaceId, table.state),
]);

export type BusinessCampaign = typeof businessCampaigns.$inferSelect;
export type NewBusinessCampaign = typeof businessCampaigns.$inferInsert;

// ─── campaign_deliveries ─────────────────────────────────────────────────────

export const campaignDeliveries = pgTable('campaign_deliveries', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  campaignId: text('campaign_id').notNull().references(() => businessCampaigns.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: deliveryStatusEnum('status').notNull().default('queued'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // R4.4: unique per (campaign, recipient) to prevent duplicate deliveries
  unique('cd_campaign_recipient_unique').on(table.campaignId, table.recipientId),
  index('cd_campaign_idx').on(table.campaignId),
  index('cd_recipient_idx').on(table.recipientId),
  index('cd_status_idx').on(table.status),
]);

export type CampaignDelivery = typeof campaignDeliveries.$inferSelect;

// ─── campaign_reactions ──────────────────────────────────────────────────────
// Reaction videos submitted by followers against a specific campaign.

export const campaignReactions = pgTable('campaign_reactions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  campaignId: text('campaign_id').notNull().references(() => businessCampaigns.id, { onDelete: 'cascade' }),
  reactorId: text('reactor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  videoUrl: text('video_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('cr_campaign_reactor_unique').on(table.campaignId, table.reactorId),
  index('cr_campaign_idx').on(table.campaignId),
  index('cr_reactor_idx').on(table.reactorId),
  index('cr_campaign_created_idx').on(table.campaignId, table.createdAt),
]);

export type CampaignReaction = typeof campaignReactions.$inferSelect;
export type NewCampaignReaction = typeof campaignReactions.$inferInsert;

// ─── Relations (for Drizzle relational queries) ───────────────────────────────

import { relations } from 'drizzle-orm';

export const businessWorkspacesRelations = relations(businessWorkspaces, ({ many }) => ({
  members: many(businessMembers),
  followers: many(businessFollowers),
  campaigns: many(businessCampaigns),
}));

export const businessMembersRelations = relations(businessMembers, ({ one }) => ({
  workspace: one(businessWorkspaces, {
    fields: [businessMembers.workspaceId],
    references: [businessWorkspaces.id],
  }),
}));

export const businessCampaignsRelations = relations(businessCampaigns, ({ one, many }) => ({
  workspace: one(businessWorkspaces, {
    fields: [businessCampaigns.workspaceId],
    references: [businessWorkspaces.id],
  }),
  deliveries: many(campaignDeliveries),
}));

export const campaignDeliveriesRelations = relations(campaignDeliveries, ({ one }) => ({
  campaign: one(businessCampaigns, {
    fields: [campaignDeliveries.campaignId],
    references: [businessCampaigns.id],
  }),
}));

export const campaignReactionsRelations = relations(campaignReactions, ({ one }) => ({
  campaign: one(businessCampaigns, {
    fields: [campaignReactions.campaignId],
    references: [businessCampaigns.id],
  }),
}));
