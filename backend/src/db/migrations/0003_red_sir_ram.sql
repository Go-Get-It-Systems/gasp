ALTER TABLE "gasps" ADD COLUMN "replayable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gasps" ADD COLUMN "opened_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "gasps_status_opened_idx" ON "gasps" USING btree ("status","opened_at");