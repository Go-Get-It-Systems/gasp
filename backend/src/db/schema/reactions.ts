import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { gasps } from './gasps';
import { users } from './users';

export const reactions = pgTable('reactions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  gaspId: text('gasp_id').notNull().references(() => gasps.id, { onDelete: 'cascade' }),
  reactorId: text('reactor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  videoUrl: text('video_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('reactions_gasp_idx').on(table.gaspId),
  index('reactions_reactor_idx').on(table.reactorId),
  index('reactions_gasp_created_idx').on(table.gaspId, table.createdAt),
]);

export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;
