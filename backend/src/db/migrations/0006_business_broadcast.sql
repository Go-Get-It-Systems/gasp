-- Migration 0006: Business Broadcast — additive tables
-- Does NOT modify any existing table. All new tables use ON DELETE CASCADE FKs.

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "campaign_state" AS ENUM('draft', 'publishing', 'live', 'failed', 'closed');
CREATE TYPE "delivery_status" AS ENUM('queued', 'delivered', 'failed', 'opened', 'viewed');

-- ─── business_workspaces ─────────────────────────────────────────────────────

CREATE TABLE "business_workspaces" (
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
);

CREATE INDEX "bw_handle_idx" ON "business_workspaces" ("handle");
CREATE INDEX "bw_active_idx" ON "business_workspaces" ("is_active");

-- ─── business_members ────────────────────────────────────────────────────────

CREATE TABLE "business_members" (
  "id"           TEXT PRIMARY KEY,
  "workspace_id" TEXT NOT NULL REFERENCES "business_workspaces"("id") ON DELETE CASCADE,
  "user_id"      TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role"         VARCHAR(20) NOT NULL DEFAULT 'owner',
  "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("workspace_id", "user_id")
);

CREATE INDEX "bm_user_idx"      ON "business_members" ("user_id");
CREATE INDEX "bm_workspace_idx" ON "business_members" ("workspace_id");

-- ─── business_followers ──────────────────────────────────────────────────────
-- R2.5: explicit/idempotent/independent stored as concrete columns

CREATE TABLE "business_followers" (
  "id"           TEXT PRIMARY KEY,
  "workspace_id" TEXT NOT NULL REFERENCES "business_workspaces"("id") ON DELETE CASCADE,
  "user_id"      TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "explicit"     BOOLEAN NOT NULL DEFAULT FALSE,
  "idempotent"   BOOLEAN NOT NULL DEFAULT TRUE,
  "independent"  BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("workspace_id", "user_id")
);

CREATE INDEX "bf_workspace_idx" ON "business_followers" ("workspace_id");
CREATE INDEX "bf_user_idx"      ON "business_followers" ("user_id");

-- ─── business_campaigns ──────────────────────────────────────────────────────

CREATE TABLE "business_campaigns" (
  "id"           TEXT PRIMARY KEY,
  "workspace_id" TEXT NOT NULL REFERENCES "business_workspaces"("id") ON DELETE CASCADE,
  "title"        VARCHAR(100) NOT NULL,
  "media_url"    TEXT NOT NULL,
  "text_overlay" VARCHAR(200),
  "is_replayable" BOOLEAN NOT NULL DEFAULT FALSE,
  "state"        campaign_state NOT NULL DEFAULT 'draft',
  "published_at" TIMESTAMPTZ,
  "closed_at"    TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "bc_workspace_idx"       ON "business_campaigns" ("workspace_id");
CREATE INDEX "bc_state_idx"           ON "business_campaigns" ("state");
CREATE INDEX "bc_workspace_state_idx" ON "business_campaigns" ("workspace_id", "state");

-- ─── campaign_deliveries ─────────────────────────────────────────────────────
-- R4.4: unique (campaign_id, recipient_id) prevents duplicate deliveries

CREATE TABLE "campaign_deliveries" (
  "id"           TEXT PRIMARY KEY,
  "campaign_id"  TEXT NOT NULL REFERENCES "business_campaigns"("id") ON DELETE CASCADE,
  "recipient_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status"       delivery_status NOT NULL DEFAULT 'queued',
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("campaign_id", "recipient_id")
);

CREATE INDEX "cd_campaign_idx"   ON "campaign_deliveries" ("campaign_id");
CREATE INDEX "cd_recipient_idx"  ON "campaign_deliveries" ("recipient_id");
CREATE INDEX "cd_status_idx"     ON "campaign_deliveries" ("status");
