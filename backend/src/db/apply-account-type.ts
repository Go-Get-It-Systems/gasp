/**
 * Applies the account_type column directly via raw SQL, then lists all users
 * so you can confirm which usernames exist.
 * Run once: npx tsx src/db/apply-account-type.ts [username]
 *
 * If username is omitted, lists all users and their current account_type.
 */
import { sql } from 'drizzle-orm';
import { db } from '../config/database.js';

// Step 1: create enum type if it doesn't exist
try {
  await db.execute(sql`CREATE TYPE "account_type" AS ENUM('personal', 'business')`);
  console.log('✓ Created enum account_type');
} catch (e: any) {
  if (e?.code === '42710') {
    console.log('• Enum account_type already exists, skipping');
  } else {
    throw e;
  }
}

// Step 2: add column if it doesn't exist
try {
  await db.execute(sql`
    ALTER TABLE "users"
    ADD COLUMN "account_type" "account_type" NOT NULL DEFAULT 'personal'
  `);
  console.log('✓ Added column account_type to users');
} catch (e: any) {
  if (e?.code === '42701') {
    console.log('• Column account_type already exists, skipping');
  } else {
    throw e;
  }
}

const username = process.argv[2];

if (!username) {
  // List all users so we can find the right one
  const allUsers = await db.execute(sql`
    SELECT id, username, display_name, account_type FROM users ORDER BY created_at DESC
  `);
  console.log('\nAll users in the database:');
  for (const u of allUsers) {
    const row = u as any;
    console.log(`  username="${row.username}"  display_name="${row.display_name}"  account_type="${row.account_type}"`);
  }
  console.log('\nTo set a user as business, run:');
  console.log('  npx tsx src/db/apply-account-type.ts <username>');
  process.exit(0);
}

// Step 3: set the given username as business
const result = await db.execute(sql`
  UPDATE users
  SET account_type = 'business', updated_at = NOW()
  WHERE LOWER(username) = ${username.toLowerCase()}
  RETURNING id, username, account_type
`);

if (result.length > 0) {
  console.log(`✓ Updated: ${(result[0] as any).username} → account_type = ${(result[0] as any).account_type}`);
} else {
  console.warn(`⚠ User "${username}" not found`);
}

process.exit(0);
