import { pgTable, text, timestamp, varchar, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { conversations } from './conversations';
import { users } from './users';

export const messages = pgTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: varchar('type', { length: 20 }).notNull().default('text'),
  mediaUrl: text('media_url'),
  replyToId: text('reply_to_id'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('messages_conversation_idx').on(table.conversationId),
  index('messages_sender_idx').on(table.senderId),
  index('messages_created_idx').on(table.conversationId, table.createdAt),
]);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
