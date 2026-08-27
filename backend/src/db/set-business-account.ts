/**
 * One-time script: set accountType = 'business' for a given username.
 * Usage: npx tsx src/db/set-business-account.ts ggitsystems
 */
import { db } from '../config/database.js';
import { users } from './schema/users.js';
import { eq, ilike } from 'drizzle-orm';

const username = process.argv[2];
if (!username) {
  console.error('Usage: npx tsx src/db/set-business-account.ts <username>');
  process.exit(1);
}

const [updated] = await db
  .update(users)
  .set({ accountType: 'business', updatedAt: new Date() })
  .where(ilike(users.username, username))
  .returning({ id: users.id, username: users.username, accountType: users.accountType });

if (updated) {
  console.log(`✓ Updated: ${updated.username} → accountType = ${updated.accountType}`);
} else {
  console.error(`✗ User "${username}" not found`);
}

process.exit(0);
