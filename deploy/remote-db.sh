#!/usr/bin/env bash
# Run a local command against the PRODUCTION database through an SSH tunnel. Credentials are read from the
# server's .env.production and never printed.
# Usage: bash deploy/remote-db.sh pnpm db:seed
#        bash deploy/remote-db.sh pnpm staff:create you@example.com "Your Name"
set -euo pipefail
cd "$(dirname "$0")/.."
HOST="${VIKKAA_HOST:-yoho-vps}"
ENVF=/srv/vikkaa/app/.env.production
get() { ssh "$HOST" "sudo grep -E '^$1=' $ENVF | cut -d= -f2-"; }
U=$(get POSTGRES_USER); P=$(get POSTGRES_PASSWORD); D=$(get POSTGRES_DB)

ssh -N -o ExitOnForwardFailure=yes -L 5442:127.0.0.1:5442 "$HOST" &
TUNNEL=$!
trap 'kill $TUNNEL 2>/dev/null || true' EXIT
for _ in $(seq 1 20); do (exec 3<>/dev/tcp/127.0.0.1/5442) 2>/dev/null && break; sleep 0.5; done

DATABASE_URL="postgres://$U:$P@127.0.0.1:5442/$D" "$@"
