CREATE TYPE "public"."package_kind" AS ENUM('upfront', 'retainer', 'pilot');--> statement-breakpoint
CREATE TYPE "public"."channel_status" AS ENUM('not_set', 'handle_saved', 'connected', 'api_approved', 'rejected');--> statement-breakpoint
CREATE TABLE "packages" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"name" text NOT NULL,
	"segment" text NOT NULL,
	"category" "asset_category" NOT NULL,
	"kind" "package_kind" NOT NULL,
	"price_cents" bigint NOT NULL,
	"units_per_month" integer,
	"exclusive_days" integer,
	"follow_on_months" integer,
	"commission_bp" integer,
	"commission_min_cents" bigint DEFAULT 0 NOT NULL,
	"founding" boolean DEFAULT false NOT NULL,
	"public_from" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"key" text NOT NULL,
	"handle" text,
	"url" text,
	"external_id" text,
	"status" "channel_status" DEFAULT 'not_set' NOT NULL,
	"owner_user_id" text,
	"show_in_footer" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_settings" (
	"organization_id" text PRIMARY KEY DEFAULT 'org_vikkaa' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" text
);
--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "package_id" text;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "founding_terms" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "monthly_fee_cents" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "units_per_month" integer;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "billing_day" integer;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "retainer_ends_on" date;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "commission_min_cents" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "channel_connections_org_key_idx" ON "channel_connections" USING btree ("organization_id","key");--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;