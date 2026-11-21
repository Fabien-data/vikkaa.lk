CREATE TYPE "public"."area_price_kind" AS ENUM('land_perch', 'house', 'apartment', 'vehicle');--> statement-breakpoint
CREATE TYPE "public"."asset_category" AS ENUM('property', 'vehicle');--> statement-breakpoint
CREATE TYPE "public"."asset_kind" AS ENUM('house', 'apartment', 'land', 'commercial', 'car', 'suv', 'van', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('draft', 'production', 'live', 'under_offer', 'sold', 'expired', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."client_type" AS ENUM('private', 'dealer', 'developer', 'agent', 'overseas');--> statement-breakpoint
CREATE TYPE "public"."engagement_stage" AS ENUM('intake', 'call', 'visit', 'proposal', 'signed', 'no_go', 'closed');--> statement-breakpoint
CREATE TYPE "public"."engagement_type" AS ENUM('single', 'batch', 'project', 'retainer');--> statement-breakpoint
CREATE TABLE "area_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"kind" "area_price_kind" NOT NULL,
	"district" text,
	"area" text,
	"make" text,
	"model" text,
	"year" integer,
	"low_cents" bigint NOT NULL,
	"high_cents" bigint NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"engagement_id" text NOT NULL,
	"category" "asset_category" NOT NULL,
	"kind" "asset_kind" NOT NULL,
	"status" "asset_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"district" text NOT NULL,
	"area" text NOT NULL,
	"address" text,
	"asking_price_cents" bigint NOT NULL,
	"recommended_price_cents" bigint,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"youtube_url" text,
	"published_at" timestamp,
	"sold_at" timestamp,
	"sold_price_cents" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"type" "client_type" NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparables" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"engagement_id" text NOT NULL,
	"asset_id" text,
	"description" text NOT NULL,
	"price_cents" bigint NOT NULL,
	"source" text NOT NULL,
	"observed_on" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"client_id" text NOT NULL,
	"type" "engagement_type" NOT NULL,
	"stage" "engagement_stage" DEFAULT 'intake' NOT NULL,
	"parent_engagement_id" text,
	"intake_answers" jsonb,
	"fit_score" integer,
	"fit_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"upfront_fee_cents" bigint DEFAULT 0 NOT NULL,
	"ad_budget_cents" bigint DEFAULT 0 NOT NULL,
	"commission_applies" boolean DEFAULT true NOT NULL,
	"commission_rate_bp" integer NOT NULL,
	"exclusive_days" integer NOT NULL,
	"follow_on_months" integer NOT NULL,
	"content_plan" text,
	"market_notes" text,
	"no_go_reason" text,
	"price_read" text,
	"signed_at" timestamp,
	"ends_at" timestamp,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "area_prices" ADD CONSTRAINT "area_prices_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparables" ADD CONSTRAINT "comparables_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparables" ADD CONSTRAINT "comparables_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparables" ADD CONSTRAINT "comparables_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_org_phone_idx" ON "clients" USING btree ("organization_id","phone");