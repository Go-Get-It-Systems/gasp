-- Migration 0007: follow enhancements + campaign reactions
-- Additive — does NOT modify existing tables except adding columns to business_workspaces.

-- 1. Add following_count to business_workspaces (how many other workspaces this one follows)
ALTER TABLE "business_workspaces"
  ADD COLUMN IF NOT EXISTS "following_count" INTEGER NOT NULL DEFAULT 0;

-- 2. Add follower_type to business_followers so we can track business→business follows
--    'user'     : a personal/business user following this workspace
--    'workspace': another business workspace following this workspace
ALTER TABLE "business_followers"
  ADD COLUMN IF NOT EXISTS "follower_type" VARCHAR(10) NOT NULL DEFAULT 'user';

-- 3. campaign_reactions — stores reaction videos submitted by followers against a campaign
CREATE TABLE IF NOT EXISTS "campaign_reactions" (
  "id"           TEXT PRIMARY KEY,
  "campaign_id"  TEXT NOT NULL REFERENCES "business_campaigns"("id") ON DELETE CASCADE,
  "reactor_id"   TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "video_url"    TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("campaign_id", "reactor_id")
);

CREATE INDEX "cr_campaign_idx"  ON "campaign_reactions" ("campaign_id");
CREATE INDEX "cr_reactor_idx"   ON "campaign_reactions" ("reactor_id");
CREATE INDEX "cr_campaign_created_idx" ON "campaign_reactions" ("campaign_id", "created_at");
