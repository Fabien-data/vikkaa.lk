#!/usr/bin/env bash
# Run on YOUR machine from the repo root: bash deploy/deploy.sh
# The VPS is shared with other sites and short on disk and memory, so the image is built here and shipped;
# nothing is compiled on the server. Needs Docker locally and the `yoho-vps` ssh alias (ubuntu@139.99.90.67).
set -euo pipefail
cd "$(dirname "$0")/.."
HOST="${VIKKAA_HOST:-yoho-vps}"
APP=/srv/vikkaa/app
COMPOSE="sudo docker compose -f $APP/deploy/docker-compose.prod.yml"
TAG=$(git rev-parse --short HEAD)

docker build --platform linux/amd64 -f deploy/Dockerfile --target runner -t "vikkaa-web:$TAG" -t vikkaa-web:latest .
docker save "vikkaa-web:$TAG" vikkaa-web:latest | gzip | ssh "$HOST" 'gunzip | sudo docker load'
scp -q deploy/docker-compose.prod.yml deploy/backup.sh "$HOST:$APP/deploy/"

ssh "$HOST" "$COMPOSE up -d db"
# TCP check: during first-boot init Postgres only listens on its socket, so this waits for the real server.
ssh "$HOST" "for i in \$(seq 60); do $COMPOSE exec -T db pg_isready -q -h 127.0.0.1 && exit 0; sleep 2; done; echo 'db not ready'; exit 1"
bash deploy/remote-db.sh pnpm db:migrate
ssh "$HOST" "$COMPOSE up -d --no-build web && $COMPOSE ps"

# Keep this image and the previous one (for a quick roll back); drop older ones so the shared disk doesn't fill.
ssh "$HOST" "sudo docker images vikkaa-web --format '{{.Tag}}' | grep -v -e latest -e '^$TAG\$' | tail -n +2 | xargs -r -I{} sudo docker rmi vikkaa-web:{} >/dev/null; sudo docker image prune -f >/dev/null"
echo "Deployed $TAG"
