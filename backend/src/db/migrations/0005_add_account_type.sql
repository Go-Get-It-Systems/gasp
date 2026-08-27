-- Migration: add account_type enum and column to users table
-- Additive migration — preserves all existing rows (default 'personal')

CREATE TYPE "account_type" AS ENUM('personal', 'business');

ALTER TABLE "users"
  ADD COLUMN "account_type" "account_type" NOT NULL DEFAULT 'personal';
