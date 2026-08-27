/**
 * Deletes a user by username (cascade-safe: removes related rows first).
 * Usage: npx tsx src/db/delete-user.ts <username>
 */
import { sql } from 'drizzle-orm';
import { db } from '../config/database.js';

const username = process.argv[2];
if (!username) {
  console.error('Usage: npx tsx src/db/delete-user.ts <username>');
  process.exit(1);
}

// Find user first
const found = await db.execute(sql`
  SELECT id, username, display_name FROM users WHERE LOWER(username) = ${username.toLowerCase()}
`);

if (found.length === 0) {
  console.error(`User "${username}" not found`);
  process.exit(1);
}

const user = found[0] as any;
console.log(`Found: ${user.display_name} (@${user.username}) — id: ${user.id}`);

// All related tables have ON DELETE CASCADE foreign keys to users,
// so a single delete on users cascades everything automatically.
await db.execute(sql`DELETE FROM users WHERE id = ${user.id}`);

console.log(`✓ Deleted user "${user.username}" and all related data`);
process.exit(0);
