CREATE TYPE "public"."agreement_kind" AS ENUM('seller_exclusive', 'founding', 'retainer', 'pilot');--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'retainer_invoice';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'commission_invoice';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'claim_pack';--> statement-breakpoint
CREATE TABLE "agreement_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"kind" "agreement_kind" NOT NULL,
	"version" integer NOT NULL,
	"clauses" jsonb NOT NULL,
	"notes" text,
	"created_by_user_id" text,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"approval_reference" text,
	"approved_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "agreement_kind" "agreement_kind";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "asset_id" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "due_on" date;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "void_reason" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "agreement_templates" ADD CONSTRAINT "agreement_templates_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreement_templates" ADD CONSTRAINT "agreement_templates_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreement_templates" ADD CONSTRAINT "agreement_templates_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agreement_templates_kind_version_idx" ON "agreement_templates" USING btree ("organization_id","kind","version");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_dedupeKey_unique" UNIQUE("dedupe_key");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_key_unique" UNIQUE("key");