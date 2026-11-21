CREATE TYPE "public"."contact_channel" AS ENUM('web_form', 'whatsapp', 'phone', 'in_person', 'email');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('first_contact', 'contact', 'viewing', 'test_drive', 'offer', 'correction');--> statement-breakpoint
CREATE TABLE "buyers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"name" text,
	"phone" text NOT NULL,
	"email" text,
	"nic" text,
	"budget_min_cents" bigint,
	"budget_max_cents" bigint,
	"areas" text,
	"kinds" jsonb,
	"timeline" text,
	"financing" text,
	"source" text,
	"privacy_accepted_at" timestamp with time zone,
	"circle_consent_at" timestamp with time zone,
	"circle_withdrawn_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"asset_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"type" "evidence_type" NOT NULL,
	"channel" "contact_channel" NOT NULL,
	"happened_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by_user_id" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"corrects_entry_id" text,
	"prev_hash" char(64) NOT NULL,
	"hash" char(64) NOT NULL,
	CONSTRAINT "evidence_entries_seq_unique" UNIQUE("seq")
);
--> statement-breakpoint
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_entries" ADD CONSTRAINT "evidence_entries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_entries" ADD CONSTRAINT "evidence_entries_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_entries" ADD CONSTRAINT "evidence_entries_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_entries" ADD CONSTRAINT "evidence_entries_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "buyers_org_phone_idx" ON "buyers" USING btree ("organization_id","phone");