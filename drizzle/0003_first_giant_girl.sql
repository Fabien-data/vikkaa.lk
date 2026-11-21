CREATE TYPE "public"."signatory_role" AS ENUM('owner', 'co_owner', 'poa_holder');--> statement-breakpoint
CREATE TABLE "signatories" (
	"id" text PRIMARY KEY NOT NULL,
	"engagement_id" text NOT NULL,
	"role" "signatory_role" NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"poa_storage_key" text,
	"otp_hash" text,
	"otp_expires_at" timestamp,
	"otp_sent_at" timestamp,
	"otp_attempts" integer DEFAULT 0 NOT NULL,
	"signed_at" timestamp,
	"signed_name" text,
	"signed_id_number" text,
	"signed_phone" text,
	"signed_ip" text,
	"signed_user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signatories" ADD CONSTRAINT "signatories_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;