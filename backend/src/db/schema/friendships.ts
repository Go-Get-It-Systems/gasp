import { pgTable, text, timestamp, varchar, index, unique } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';

export const friendships = pgTable('friendships', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  requesterId: text('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addresseeId: text('addressee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('unique_friendship').on(table.requesterId, table.addresseeId),
  index('friendships_requester_idx').on(table.requesterId),
  index('friendships_addressee_idx').on(table.addresseeId),
  index('friendships_status_idx').on(table.status),
  index('friendships_status_requester_idx').on(table.status, table.requesterId),
  index('friendships_status_addressee_idx').on(table.status, table.addresseeId),
]);

export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;
