/**
 * Applies migration 0006 (business_broadcast tables) directly via raw SQL.
 * Use when drizzle-kit migrate marks it applied without running the SQL.
 *
 * Run: node --import tsx/esm src/db/apply-migration-006.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/gasp';
const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function run() {
  console.log('Applying migration 0006 — business broadcast tables...\n');

  // ── Enums ────────────────────────────────────────────────────────────────
  try {
    await db.execute(sql`CREATE TYPE "campaign_state" AS ENUM('draft','publishing','live','failed','closed')`);
    console.log('✓ Created enum campaign_state');
  } catch (e: any) {
    if (e?.code === '42710') console.log('• Enum campaign_state already exists');
    else throw e;
  }

  try {
    await db.execute(sql`CREATE TYPE "delivery_status" AS ENUM('queued','delivered','failed','opened','viewed')`);
    console.log('✓ Created enum delivery_status');
  } catch (e: any) {
    if (e?.code === '42710') console.log('• Enum delivery_status already exists');
    else throw e;
  }

  // ── Tables ───────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "business_workspaces" (
      "id"             TEXT PRIMARY KEY,
      "handle"         VARCHAR(30) NOT NULL UNIQUE,
      "display_name"   VARCHAR(100) NOT NULL,
      "avatar_url"     TEXT,
      "bio"            TEXT,
      "is_verified"    BOOLEAN NOT NULL DEFAULT FALSE,
      "is_active"      BOOLEAN NOT NULL DEFAULT TRUE,
      "follower_count" INTEGER NOT NULL DEFAULT 0,
      "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✓ Table business_workspaces');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "business_members" (
      "id"           TEXT PRIMARY KEY,
      "workspace_id" TEXT NOT NULL REFERENCES "business_workspaces"("id") ON DELETE CASCADE,
      "user_id"      TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "role"         VARCHAR(20) NOT NULL DEFAULT 'owner',
      "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
      "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("workspace_id", "user_id")
    )
  `);
  console.log('✓ Table business_members');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "business_followers" (
      "id"           TEXT PRIMARY KEY,
      "workspace_id" TEXT NOT NULL REFERENCES "business_workspaces"("id") ON DELETE CASCADE,
      "user_id"      TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "explicit"     BOOLEAN NOT NULL DEFAULT FALSE,
      "idempotent"   BOOLEAN NOT NULL DEFAULT TRUE,
      "independent"  BOOLEAN NOT NULL DEFAULT TRUE,
      "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("workspace_id", "user_id")
    )
  `);
  console.log('✓ Table business_followers');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "business_campaigns" (
      "id"            TEXT PRIMARY KEY,
      "workspace_id"  TEXT NOT NULL REFERENCES "business_workspaces"("id") ON DELETE CASCADE,
      "title"         VARCHAR(100) NOT NULL,
      "media_url"     TEXT NOT NULL,
      "text_overlay"  VARCHAR(200),
      "is_replayable" BOOLEAN NOT NULL DEFAULT FALSE,
      "state"         campaign_state NOT NULL DEFAULT 'draft',
      "published_at"  TIMESTAMPTZ,
      "closed_at"     TIMESTAMPTZ,
      "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✓ Table business_campaigns');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "campaign_deliveries" (
      "id"           TEXT PRIMARY KEY,
      "campaign_id"  TEXT NOT NULL REFERENCES "business_campaigns"("id") ON DELETE CASCADE,
      "recipient_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "status"       delivery_status NOT NULL DEFAULT 'queued',
      "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE ("campaign_id", "recipient_id")
    )
  `);
  console.log('✓ Table campaign_deliveries');

  // ── Seed workspace for ggit ──────────────────────────────────────────────
  const users = await db.execute(sql`
    SELECT id, username, display_name FROM users WHERE LOWER(username) = 'ggit'
  `);

  if (users.length > 0) {
    const user = users[0] as any;
    const workspaceId = createId();

    const existing = await db.execute(sql`
      SELECT id FROM business_workspaces WHERE handle = ${user.username.toLowerCase()}
    `);

    if (existing.length === 0) {
      await db.execute(sql`
        INSERT INTO business_workspaces (id, handle, display_name, is_verified, is_active, follower_count, created_at, updated_at)
        VALUES (${workspaceId}, ${user.username.toLowerCase()}, ${user.display_name}, false, true, 0, NOW(), NOW())
      `);
      console.log(`\n✓ Created workspace for @${user.username} — id: ${workspaceId}`);

      await db.execute(sql`
        INSERT INTO business_members (id, workspace_id, user_id, role, is_active, created_at)
        VALUES (${createId()}, ${workspaceId}, ${user.id}, 'owner', true, NOW())
      `);
      console.log('✓ Created owner membership');
    } else {
      const wsId = (existing[0] as any).id;
      console.log(`\n• Workspace already exists for @${user.username} — id: ${wsId}`);

      const memberExists = await db.execute(sql`
        SELECT id FROM business_members WHERE workspace_id = ${wsId} AND user_id = ${user.id}
      `);
      if (memberExists.length === 0) {
        await db.execute(sql`
          INSERT INTO business_members (id, workspace_id, user_id, role, is_active, created_at)
          VALUES (${createId()}, ${wsId}, ${user.id}, 'owner', true, NOW())
        `);
        console.log('✓ Created owner membership');
      } else {
        console.log('• Membership already exists');
      }
    }
  } else {
    console.log('\n⚠ User "ggit" not found — log in first, then re-run this script');
  }

  console.log('\n✅ Migration 0006 applied successfully');
  await client.end();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
