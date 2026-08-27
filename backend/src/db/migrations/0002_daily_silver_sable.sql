ALTER TABLE "gasps" ADD COLUMN "text_overlay" text;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friendships_status_requester_idx" ON "friendships" USING btree ("status","requester_id");--> statement-breakpoint
CREATE INDEX "friendships_status_addressee_idx" ON "friendships" USING btree ("status","addressee_id");--> statement-breakpoint
CREATE INDEX "gasps_recipient_status_expires_idx" ON "gasps" USING btree ("recipient_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "gasps_sender_created_idx" ON "gasps" USING btree ("sender_id","created_at");--> statement-breakpoint
CREATE INDEX "reactions_gasp_created_idx" ON "reactions" USING btree ("gasp_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_subs_user_idx" ON "webhook_subscriptions" USING btree ("user_id");