CREATE TYPE "public"."ad_ledger_kind" AS ENUM('spend', 'refund');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('agreed', 'completed', 'fell_through');--> statement-breakpoint
CREATE TABLE "ad_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"engagement_id" text NOT NULL,
	"asset_id" text,
	"kind" "ad_ledger_kind" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"channel" text,
	"occurred_on" date NOT NULL,
	"reference" text,
	"note" text,
	"recorded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"asset_id" text NOT NULL,
	"buyer_id" text,
	"agreed_price_cents" bigint NOT NULL,
	"agreed_at" timestamp with time zone NOT NULL,
	"completion_due_on" date,
	"advance_cents" bigint DEFAULT 0 NOT NULL,
	"notary" text,
	"status" "deal_status" DEFAULT 'agreed' NOT NULL,
	"completed_at" timestamp with time zone,
	"fell_through_at" timestamp with time zone,
	"fell_through_reason" text,
	"basis" text NOT NULL,
	"notes" text,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "closed_reason" text;--> statement-breakpoint
ALTER TABLE "ad_ledger" ADD CONSTRAINT "ad_ledger_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_ledger" ADD CONSTRAINT "ad_ledger_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_ledger" ADD CONSTRAINT "ad_ledger_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_ledger" ADD CONSTRAINT "ad_ledger_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_ledger_engagement_idx" ON "ad_ledger" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "deals_asset_idx" ON "deals" USING btree ("asset_id");