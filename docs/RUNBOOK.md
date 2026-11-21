# Vikkaa runbook

**Where things live**
- Server: OVH VPS `139.99.90.67`, ssh alias `yoho-vps` (user `ubuntu`).
- Settings: `/srv/vikkaa/app/.env.production` (root-only).
- Files: `/srv/vikkaa/storage`, owned by uid 10001 (the container's app user).
- Backups: `/srv/vikkaa/backups`.

**The server is shared.** Other live sites run on it too (markui.lk, dotmax.io, mrchai.lk and more), and it is short on disk and memory. So:
- the app image is **built on the dev machine and shipped**. Nothing is compiled on the server.
- the app listens on `127.0.0.1:3020`, because 3000 belongs to another site.
- Postgres runs in its own container. Its port is published on `127.0.0.1:5442` only, so migrations can reach it through an SSH tunnel.
- never touch the other sites' nginx files, containers or databases.

## Deploy a new version

From the repo root on your machine (needs Docker and the `yoho-vps` ssh alias):

```bash
bash deploy/deploy.sh
```

It builds the image, ships it, copies the compose file and backup script, runs migrations through the tunnel, restarts `web`, and keeps only the current and previous images.

## Run something against the production database

```bash
bash deploy/remote-db.sh pnpm db:seed
bash deploy/remote-db.sh pnpm staff:create you@example.com "Your Name"   # the temporary password is printed once
```

## Change a setting (phone number, API keys, price guide…)

```bash
ssh yoho-vps
sudo nano /srv/vikkaa/app/.env.production
sudo docker compose -f /srv/vikkaa/app/deploy/docker-compose.prod.yml up -d --no-build web
```

`up -d` recreates the container with the new values.

## Roll back

```bash
git checkout <previous commit> && bash deploy/deploy.sh && git checkout main
```

Migrations only ever add. If a migration must be undone, restore the database (below).

## First-time setup (done 21 Nov 2026; kept for a rebuild)

1. **DNS at register.lk:** `vikkaa.lk`, `www.vikkaa.lk` and `app.vikkaa.lk` point at `139.99.90.67`.
2. **Archive the old site:** `ssh yoho-vps 'sudo bash -s /var/www/vikkaa' < deploy/archive-old-site.sh`.
   - The archive is at `/root/old-vikkaa-archive-2026-11.tgz` and includes the MariaDB dump.
   - The old files are still in `/var/www/vikkaa`.
3. **Folders:** create `/srv/vikkaa/{app/deploy,storage/public/media,storage/private,backups}`.
   - `chown -R 10001:10001 /srv/vikkaa/storage`
   - `chmod 711` on storage, `755` on `public`, `700` on `private`.
4. **Settings:** write `/srv/vikkaa/app/.env.production` from `deploy/.env.production.example` and `chmod 600` it.
   - Generate `POSTGRES_PASSWORD` and `APP_SECRET` with `openssl rand -hex`.
5. **First deploy:** run `bash deploy/deploy.sh`, then `bash deploy/remote-db.sh pnpm db:seed`.
6. **nginx and SSL:**
   - `sudo cp vikkaa.conf /etc/nginx/sites-available/vikkaa.conf`
   - `sudo ln -s ../sites-available/vikkaa.conf /etc/nginx/sites-enabled/`
   - remove the old `sites-enabled/vikkaa`
   - `sudo nginx -t && sudo systemctl reload nginx`
   - `sudo certbot --nginx -d vikkaa.lk -d www.vikkaa.lk`. Add `--expand -d app.vikkaa.lk` once that DNS record exists.
7. **Backups:** `/etc/cron.d/vikkaa-backup` runs `deploy/backup.sh` at 02:00 as root. To copy backups off the server, set `BACKUP_REMOTE=user@host:/path` in that file.

## Restore a backup

```bash
gunzip -c /srv/vikkaa/backups/db-YYYY-MM-DD_HHMM.sql.gz | sudo docker compose -f /srv/vikkaa/app/deploy/docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
sudo tar -xzf /srv/vikkaa/backups/private-YYYY-MM-DD_HHMM.tgz -C /srv/vikkaa/storage
```

Restore into an empty database. Test a restore on a spare machine once a month.

## Checks after any deploy

```bash
curl -sI https://vikkaa.lk | head -1                 # 200
curl -sI https://www.vikkaa.lk | grep -i location    # https://vikkaa.lk/
curl -sI https://app.vikkaa.lk | grep -i location    # /studio (once its DNS exists)
curl -sI https://vikkaa.lk/real-estate | head -1     # 301
```

Logs: `ssh yoho-vps 'sudo docker compose -f /srv/vikkaa/app/deploy/docker-compose.prod.yml logs -f web'`
