CREATE TYPE "public"."draft_kind" AS ENUM('photo_set', 'video', 'reel');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('pending', 'approved', 'changes_requested');--> statement-breakpoint
CREATE TABLE "content_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"asset_id" text NOT NULL,
	"kind" "draft_kind" NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"youtube_url" text,
	"note" text,
	"status" "draft_status" DEFAULT 'pending' NOT NULL,
	"client_comment" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;