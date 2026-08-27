import { pgTable, text, timestamp, varchar, boolean, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';

export const gasps = pgTable('gasps', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  mediaType: varchar('media_type', { length: 10 }).notNull().default('image'),
  blurhash: varchar('blurhash', { length: 100 }),
  textOverlay: text('text_overlay'),
  replayable: boolean('replayable').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('gasps_sender_idx').on(table.senderId),
  index('gasps_recipient_idx').on(table.recipientId),
  index('gasps_status_idx').on(table.status),
  index('gasps_expires_idx').on(table.expiresAt),
  index('gasps_status_opened_idx').on(table.status, table.openedAt),
  index('gasps_recipient_status_expires_idx').on(table.recipientId, table.status, table.expiresAt),
  index('gasps_sender_created_idx').on(table.senderId, table.createdAt),
]);

export type Gasp = typeof gasps.$inferSelect;
export type NewGasp = typeof gasps.$inferInsert;
