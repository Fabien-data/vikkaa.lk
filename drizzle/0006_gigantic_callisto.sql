CREATE TABLE "enquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"asset_id" text,
	"buyer_id" text NOT NULL,
	"channel" "contact_channel" NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;