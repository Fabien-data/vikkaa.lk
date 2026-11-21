CREATE TYPE "public"."document_type" AS ENUM('proposal', 'agreement', 'agreement_signed', 'agreement_scan', 'invoice', 'receipt');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'cash', 'cheque');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text DEFAULT 'org_vikkaa' NOT NULL,
	"engagement_id" text NOT NULL,
	"type" "document_type" NOT NULL,
	"number" text,
	"storage_key" text NOT NULL,
	"sha256" text NOT NULL,
	"amount_cents" bigint,
	"vat_cents" bigint,
	"total_cents" bigint,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "documents_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "number_sequences" (
	"key" text PRIMARY KEY NOT NULL,
	"last" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"received_at" timestamp NOT NULL,
	"recorded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;