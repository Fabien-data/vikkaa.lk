CREATE TYPE "public"."consent_purpose" AS ENUM('circle', 'marketing', 'all');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('email', 'sms', 'whatsapp', 'call', 'visit', 'meeting');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('out', 'in');--> statement-breakpoint
CREATE TYPE "public"."message_purpose" AS ENUM('transactional', 'outreach', 'circle', 'marketing');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('draft', 'queued', 'sending', 'sent', 'failed', 'blocked', 'cancelled', 'logged');--> statement-breakpoint
CREATE TYPE "public"."prospect_segment" AS ENUM('dealer', 'developer', 'agent', 'private', 'overseas', 'other');--> statement-breakpoint
CREATE TYPE "public"."prospect_status" AS ENUM('new', 'contacted', 'replied', 'meeting', 'won', 'lost', 'nurture');--> statement-breakpoint
ALTER TYPE "public"."subject_type" ADD VALUE 'prospect';--> statement-breakpoint
CREATE TABLE "consents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"contact" text NOT NULL,
	"purpose" "consent_purpose" NOT NULL,
	"granted" boolean NOT NULL,
	"source" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_by_user_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"key" text NOT NULL,
	"channel" "message_channel" NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"label" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"channel" "message_channel" NOT NULL,
	"direction" "message_direction" DEFAULT 'out' NOT NULL,
	"purpose" "message_purpose" NOT NULL,
	"status" "message_status" NOT NULL,
	"subject_type" "subject_type",
	"subject_id" text,
	"to_address" text,
	"from_user_id" text,
	"template_key" text,
	"subject" text,
	"body" text,
	"outcome" text,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"provider_id" text,
	"dedupe_key" text,
	"blocked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_dedupeKey_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"name" text NOT NULL,
	"segment" "prospect_segment" NOT NULL,
	"contact_name" text,
	"contact_role" text,
	"phone" text,
	"email" text,
	"district" text,
	"area" text,
	"links" text,
	"stock_note" text,
	"source" text,
	"utm" jsonb,
	"status" "prospect_status" DEFAULT 'new' NOT NULL,
	"status_changed_at" timestamp with time zone,
	"owner_user_id" text,
	"cadence_step" integer DEFAULT 0 NOT NULL,
	"next_action_at" timestamp with time zone,
	"lost_reason" text,
	"client_id" text,
	"pitch_token" text NOT NULL,
	"pitch_first_viewed_at" timestamp with time zone,
	"pitch_last_viewed_at" timestamp with time zone,
	"pitch_views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prospects_pitchToken_unique" UNIQUE("pitch_token")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consents_contact_idx" ON "consents" USING btree ("contact","at");--> statement-breakpoint
CREATE UNIQUE INDEX "message_templates_key_idx" ON "message_templates" USING btree ("organization_id","key","channel","language");--> statement-breakpoint
CREATE INDEX "messages_status_scheduled_idx" ON "messages" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "messages_subject_idx" ON "messages" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prospects_org_phone_idx" ON "prospects" USING btree ("organization_id","phone") WHERE "prospects"."phone" is not null;--> statement-breakpoint
CREATE INDEX "prospects_status_next_idx" ON "prospects" USING btree ("status","next_action_at");--> statement-breakpoint
-- Existing Vikkaa Circle opt-ins move into the consent ledger (hand-written).
INSERT INTO "consents" ("id", "organization_id", "contact", "purpose", "granted", "source", "at") SELECT gen_random_uuid()::text, "organization_id", "phone", 'circle', true, 'backfill', "circle_consent_at" FROM "buyers" WHERE "circle_consent_at" IS NOT NULL;--> statement-breakpoint
-- ...and any later opt-out, so the latest event (the withdrawal) wins.
INSERT INTO "consents" ("id", "organization_id", "contact", "purpose", "granted", "source", "at") SELECT gen_random_uuid()::text, "organization_id", "phone", 'circle', false, 'backfill', "circle_withdrawn_at" FROM "buyers" WHERE "circle_withdrawn_at" IS NOT NULL;
