import { index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';

/**
 * Directional by design: blocking someone must not imply they blocked you.
 * This stays separate from friendships, whose lifecycle is symmetric.
 */
export const userBlocks = pgTable('user_blocks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  blockerId: text('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedId: text('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('user_blocks_blocker_blocked_unique').on(table.blockerId, table.blockedId),
  index('user_blocks_blocker_idx').on(table.blockerId),
  index('user_blocks_blocked_idx').on(table.blockedId),
]);

/**
 * Reports deliberately use a polymorphic target instead of exposing safety
 * data through public content tables. Target ownership is verified in service
 * code before a row can be written.
 */
export const reports = pgTable('reports', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('reports_reporter_target_unique').on(table.reporterId, table.targetType, table.targetId),
  index('reports_status_created_idx').on(table.status, table.createdAt),
  index('reports_target_idx').on(table.targetType, table.targetId),
]);

/**
 * An append-only, media-free audit trail for safety actions and denials.
 */
export const safetyAuditEvents = pgTable('safety_audit_events', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  actorId: text('actor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectUserId: text('subject_user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('safety_audit_actor_created_idx').on(table.actorId, table.createdAt),
  index('safety_audit_event_created_idx').on(table.eventType, table.createdAt),
]);
