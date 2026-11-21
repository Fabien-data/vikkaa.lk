#!/usr/bin/env bash
# Nightly (cron 02:00): database dump + private files, kept 30 days, copied off-server.
# Set BACKUP_REMOTE=user@new-vps:/path/to/vikkaa-backups in /etc/environment or the crontab line.
set -euo pipefail
cd "$(dirname "$0")/.."
DIR=/srv/vikkaa/backups
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DIR"

docker compose -f deploy/docker-compose.prod.yml exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$DIR/db-$STAMP.sql.gz"
tar -czf "$DIR/private-$STAMP.tgz" -C /srv/vikkaa/storage private
test -s "$DIR/db-$STAMP.sql.gz" # an empty dump means the backup failed

find "$DIR" -type f -mtime +30 -delete
if [ -n "${BACKUP_REMOTE:-}" ]; then
  rsync -a "$DIR/" "$BACKUP_REMOTE/"
fi
echo "Backup $STAMP done"
