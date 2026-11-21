#!/usr/bin/env bash
# Run on the server from /srv/vikkaa/app: pulls, builds, migrates, restarts.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"

git pull --ff-only
$COMPOSE build
$COMPOSE up -d db
$COMPOSE --profile tools run --rm tools pnpm db:migrate
$COMPOSE up -d web
$COMPOSE ps
echo "Deployed $(git rev-parse --short HEAD)"
