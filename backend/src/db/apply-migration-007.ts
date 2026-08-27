/**
 * Applies migration 0007 (follow enhancements + campaign reactions) via raw SQL.
 * Run: npx tsx src/db/apply-migration-007.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/gasp';
const client = postgres(DATABASE_URL);
const db = drizzle(client);

// Add following_count to business_workspaces
try {
  await db.execute(sql`ALTER TABLE "business_workspaces" ADD COLUMN "following_count" INTEGER NOT NULL DEFAULT 0`);
  console.log('✓ Added following_count to business_workspaces');
} catch (e: any) {
  if (e?.code === '42701') console.log('• following_count already exists');
  else throw e;
}

// Add follower_type to business_followers
try {
  await db.execute(sql`ALTER TABLE "business_followers" ADD COLUMN "follower_type" VARCHAR(10) NOT NULL DEFAULT 'user'`);
  console.log('✓ Added follower_type to business_followers');
} catch (e: any) {
  if (e?.code === '42701') console.log('• follower_type already exists');
  else throw e;
}

// Create campaign_reactions table
try {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "campaign_reactions" (
      "id"            TEXT PRIMARY KEY,
      "campaign_id"   TEXT NOT NULL REFERENCES "business_campaigns"("id") ON DELETE CASCADE,
      "reactor_id"    TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "video_url"     TEXT NOT NULL,
      "thumbnail_url" TEXT,
      "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("campaign_id", "reactor_id")
    )
  `);
  console.log('✓ Created campaign_reactions table');
} catch (e: any) {
  if (e?.code === '42P07') console.log('• campaign_reactions already exists');
  else throw e;
}

// Indexes
for (const idx of [
  `CREATE INDEX IF NOT EXISTS "cr_campaign_idx" ON "campaign_reactions" ("campaign_id")`,
  `CREATE INDEX IF NOT EXISTS "cr_reactor_idx" ON "campaign_reactions" ("reactor_id")`,
  `CREATE INDEX IF NOT EXISTS "cr_campaign_created_idx" ON "campaign_reactions" ("campaign_id", "created_at")`,
]) {
  await db.execute(sql.raw(idx));
}
console.log('✓ Indexes created');

console.log('\n✅ Migration 0007 applied successfully');
await client.end();
process.exit(0);
