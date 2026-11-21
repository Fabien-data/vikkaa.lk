#!/usr/bin/env bash
# One-off safety archive of the OLD vikkaa.lk before it is replaced. Nothing from it is reused.
# Usage: sudo bash deploy/archive-old-site.sh /path/to/old/site
set -euo pipefail
OLD="${1:?Pass the old site folder, e.g. /var/www/vikkaa}"
OUT=/root/old-vikkaa-archive-$(date +%Y-%m)
mkdir -p "$OUT"

tar -czf "$OUT/files.tgz" -C "$(dirname "$OLD")" "$(basename "$OLD")"
cp -a /etc/nginx/sites-available "$OUT/nginx-sites-available"
if [ -f "$OLD/.env" ]; then
  # Laravel-style .env: dump the old database if it has one.
  DB=$(grep -E '^DB_DATABASE=' "$OLD/.env" | cut -d= -f2-)
  USER=$(grep -E '^DB_USERNAME=' "$OLD/.env" | cut -d= -f2-)
  PASS=$(grep -E '^DB_PASSWORD=' "$OLD/.env" | cut -d= -f2-)
  if [ -n "$DB" ]; then
    MYSQL_PWD="$PASS" mysqldump -u "$USER" "$DB" | gzip > "$OUT/db.sql.gz" || echo "Database dump failed; files are still archived."
  fi
fi
tar -czf "$OUT.tgz" -C /root "$(basename "$OUT")"
echo "Archived to $OUT.tgz. Download it before disabling the old site."
