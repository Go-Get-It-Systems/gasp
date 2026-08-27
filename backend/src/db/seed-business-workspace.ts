/**
 * Seeds a business_workspace and business_member row for an existing
 * business-type user. Run once after creating a business account.
 *
 * Usage: npx tsx src/db/seed-business-workspace.ts <username>
 *
 * Example: npx tsx src/db/seed-business-workspace.ts ggitsystems
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/gasp';
const client = postgres(DATABASE_URL);
const db = drizzle(client);

const username = process.argv[2];
if (!username) {
  console.error('Usage: npx tsx src/db/seed-business-workspace.ts <username>');
  process.exit(1);
}

// Find the user
const users = await db.execute(sql`
  SELECT id, username, display_name, account_type
  FROM users
  WHERE LOWER(username) = ${username.toLowerCase()}
`);

if (users.length === 0) {
  console.error(`User "${username}" not found`);
  await client.end();
  process.exit(1);
}

const user = users[0] as any;
console.log(`Found user: ${user.display_name} (@${user.username}) account_type=${user.account_type}`);

if (user.account_type !== 'business') {
  console.warn(`⚠ User is not a business account. Setting account_type = 'business'...`);
  await db.execute(sql`
    UPDATE users SET account_type = 'business', updated_at = NOW()
    WHERE id = ${user.id}
  `);
}

// Check if workspace already exists for this handle
const existing = await db.execute(sql`
  SELECT id FROM business_workspaces WHERE handle = ${user.username.toLowerCase()}
`);

let workspaceId: string;

if (existing.length > 0) {
  workspaceId = (existing[0] as any).id;
  console.log(`• Workspace already exists: ${workspaceId}`);
} else {
  workspaceId = createId();
  await db.execute(sql`
    INSERT INTO business_workspaces (id, handle, display_name, is_verified, is_active, follower_count, created_at, updated_at)
    VALUES (
      ${workspaceId},
      ${user.username.toLowerCase()},
      ${user.display_name},
      false,
      true,
      0,
      NOW(),
      NOW()
    )
  `);
  console.log(`✓ Created workspace: ${workspaceId} (@${user.username})`);
}

// Check if membership already exists
const existingMember = await db.execute(sql`
  SELECT id FROM business_members WHERE workspace_id = ${workspaceId} AND user_id = ${user.id}
`);

if (existingMember.length > 0) {
  console.log(`• Membership already exists`);
} else {
  const memberId = createId();
  await db.execute(sql`
    INSERT INTO business_members (id, workspace_id, user_id, role, is_active, created_at)
    VALUES (${memberId}, ${workspaceId}, ${user.id}, 'owner', true, NOW())
  `);
  console.log(`✓ Created membership: owner`);
}

console.log(`\n✅ Done. Workspace ID: ${workspaceId}`);
console.log(`   The app will now return this workspace for GET /businesses/mine`);

await client.end();
process.exit(0);
