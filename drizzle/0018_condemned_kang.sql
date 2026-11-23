ALTER TYPE "public"."consent_purpose" ADD VALUE 'outreach';--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "diagnosis" text;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "agreed_next_step" text;