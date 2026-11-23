ALTER TYPE "public"."booking_type" ADD VALUE 'call';--> statement-breakpoint
ALTER TYPE "public"."booking_type" ADD VALUE 'pitch';--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "engagement_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "prospect_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_check" CHECK ("bookings"."engagement_id" is not null or "bookings"."prospect_id" is not null);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE no action ON UPDATE no action;
