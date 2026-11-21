CREATE OR REPLACE FUNCTION evidence_entries_reject_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'evidence entries are append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER evidence_entries_append_only
BEFORE UPDATE OR DELETE ON evidence_entries
FOR EACH ROW EXECUTE FUNCTION evidence_entries_reject_change();
