# Vikkaa runbook

Server: OVH VPS `139.99.90.67`. App: `/srv/vikkaa/app`. Files: `/srv/vikkaa/storage`. Backups: `/srv/vikkaa/backups`, plus the off-server copy.

## First-time setup (once)

1. **DNS at register.lk:** `vikkaa.lk`, `www.vikkaa.lk` and `app.vikkaa.lk` point at `139.99.90.67`.
2. **Archive the old site** (it is not reused):
   `sudo bash deploy/archive-old-site.sh /path/to/old/site`
   Download the archive it prints, then remove the old site from `/etc/nginx/sites-enabled/`.
3. **Packages:**
   `sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx git`
4. **Folders:**
   `sudo mkdir -p /srv/vikkaa/{app,storage,backups} && sudo chown -R 1001:1001 /srv/vikkaa/storage`
   (uid 1001 is the app user inside the container).
5. **Code:** `git clone <private repo> /srv/vikkaa/app`, using a read-only deploy key.
6. **Settings:** `cp deploy/.env.production.example .env.production`, then fill in every value.
7. **First deploy:** run `bash deploy/deploy.sh`, then:
   - `docker compose -f deploy/docker-compose.prod.yml --profile tools run --rm tools pnpm db:seed`
   - `docker compose -f deploy/docker-compose.prod.yml --profile tools run --rm tools pnpm staff:create you@example.com "Your Name"` (once per founder; the password is printed once)
8. **nginx and SSL:**
   - `sudo cp deploy/nginx/vikkaa.conf /etc/nginx/sites-available/`
   - `sudo ln -s /etc/nginx/sites-available/vikkaa.conf /etc/nginx/sites-enabled/`
   - `sudo nginx -t && sudo systemctl reload nginx`
   - `sudo certbot --nginx -d vikkaa.lk -d www.vikkaa.lk -d app.vikkaa.lk`
9. **Backups:** `crontab -e` and add
   `0 2 * * * BACKUP_REMOTE=user@new-vps:/srv/backups/vikkaa /srv/vikkaa/app/deploy/backup.sh >> /var/log/vikkaa-backup.log 2>&1`
   Then run `deploy/backup.sh` once by hand.

## Deploy a new version

`cd /srv/vikkaa/app && bash deploy/deploy.sh`. It pulls, builds, runs migrations and restarts.

## Roll back

`git reset --hard <previous commit> && SKIP_PULL=1 bash deploy/deploy.sh`.

This stays on the branch, so later deploys still work. When the fix is pushed, run `git reset --hard origin/main && bash deploy/deploy.sh`.

Migrations only ever add. If a migration must be undone, restore the database (below).

## Restore a backup

```bash
gunzip -c /srv/vikkaa/backups/db-YYYY-MM-DD_HHMM.sql.gz | docker compose -f deploy/docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
tar -xzf /srv/vikkaa/backups/private-YYYY-MM-DD_HHMM.tgz -C /srv/vikkaa/storage
```

Restore into an empty database. Test a restore on a spare machine once a month.

## Checks after any deploy

```bash
curl -sI https://vikkaa.lk | head -1                 # 200
curl -sI https://www.vikkaa.lk | grep -i location    # https://vikkaa.lk/
curl -sI https://app.vikkaa.lk | grep -i location    # /studio
curl -sI https://vikkaa.lk/real-estate | head -1     # 301
```

Logs: `docker compose -f deploy/docker-compose.prod.yml logs -f web`
