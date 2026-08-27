import { pgTable, text, timestamp, varchar, boolean, index, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const accountTypeEnum = pgEnum('account_type', ['personal', 'business']);

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  firebaseUid: text('firebase_uid').notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  username: varchar('username', { length: 30 }).notNull().unique(),
  avatarUrl: text('avatar_url'),
  bio: text('bio').default(''),
  accountType: accountTypeEnum('account_type').default('personal').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('users_firebase_uid_idx').on(table.firebaseUid),
  index('users_username_idx').on(table.username),
  index('users_phone_idx').on(table.phoneNumber),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
