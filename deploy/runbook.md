# MyQRCards VPS runbook

## Layout

| Path | Purpose |
|---|---|
| `/opt/myqrcards` | App checkout + compose |
| `/opt/myqrcards/.env.production` | Secrets (mode `640`, owner `deploy`) |
| `/opt/myqrcards/backups/` | Postgres dumps |
| `/etc/nginx/sites-available/myqrcards` | Reverse proxy |

Containers (`docker-compose.prod.yml`): `web`, `api`, `postgres`, `redis`.  
Postgres/Redis are **not** published publicly; web/api bind `127.0.0.1:3000/3001` for host Nginx.

## First-time setup

1. Provision: as root, from a copy of this repo on the VPS:
   ```bash
   DOMAIN=cards.example.com DEPLOY_USER=deploy bash deploy/scripts/provision-vps.sh
   ```
2. Add your SSH public key to `/home/deploy/.ssh/authorized_keys`.
3. As `deploy`:
   ```bash
   cd /opt/myqrcards
   git clone <repo-url> .
   cp .env.production.example .env.production
   # edit: NEXT_PUBLIC_APP_URL, WEB_ORIGIN (same HTTPS URL), JWT_SECRET, POSTGRES_PASSWORD, VK_*
   chmod 640 .env.production
   ```
4. DNS A/AAAA → VPS IP.
5. Deploy:
   ```bash
   ./deploy/scripts/deploy.sh
   ```
6. TLS:
   ```bash
   sudo certbot --nginx -d cards.example.com
   ```
7. Smoke: open `https://domain/`, login, `/u/{slug}`, QR URL host, vCard download.

**Do not** run `npm run db:seed` on production.

## Deploy (update)

After every merge that should reach production (frontend **or** backend):

```bash
cd /opt/myqrcards
./deploy/scripts/deploy.sh
# or: BRANCH=cursor/… ./deploy/scripts/deploy.sh
```

`deploy.sh` always:
1. Fast-forwards git to `BRANCH`
2. Rebuilds **api** and **web** images with `GIT_SHA`
3. Force-recreates **api** and **web** containers
4. Checks `/api/v1/healthz` (`gitSha`) and `/build-id.txt` match that SHA

API container runs `prisma migrate deploy` on start.

### Do not (anti-patterns)

| Bad | Why it fails |
|---|---|
| `git pull` only | Host checkout updates; running Docker images do not |
| `docker compose up -d --force-recreate api` after UI merge | Web keeps serving the previous Next build |
| Rely on browser cache clear | Prod HTML comes from the old `web` image |
| Skip deploy after merging to `main` | Merge ≠ release until `deploy.sh` (or CI Deploy VPS) runs |

**Env-only** changes (e.g. `VK_ID_*` in `.env.production`) may recreate just `api` without a rebuild. Any change under `apps/web` or `apps/api` requires full `./deploy/scripts/deploy.sh`.

## Rollback

Images are rebuilt in place. Prefer git rollback:

```bash
cd /opt/myqrcards
git log --oneline -10
git checkout <known-good-sha>
./deploy/scripts/deploy.sh
```

If DB migrate moved forward and you must roll back code only, ensure migrations remain compatible (no automatic down migrations).

## Logs

```bash
cd /opt/myqrcards
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail=200 api
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f --tail=200 web
sudo journalctl -u nginx -f
```

## Backup / restore

```bash
./deploy/scripts/backup-postgres.sh
./deploy/scripts/restore-postgres.sh backups/postgres-YYYYMMDDThhmmssZ.sql.gz
```

Schedule daily backup via cron as `deploy`:

```cron
15 3 * * * APP_DIR=/opt/myqrcards /opt/myqrcards/deploy/scripts/backup-postgres.sh >>/opt/myqrcards/backups/cron.log 2>&1
```

## Env invariants

- `NEXT_PUBLIC_APP_URL` === `WEB_ORIGIN` === public HTTPS origin (no trailing slash).
- `COOKIE_SECURE=true`.
- Canonical QR/vCard URLs come from `WEB_ORIGIN`, never from request `Host`.
- Rebuild **web** after changing `NEXT_PUBLIC_*` (baked at image build time).
- Deployed revision: `curl -fsS https://$DOMAIN/build-id.txt` and `…/api/v1/healthz` → `gitSha` must equal `git rev-parse HEAD` on the VPS.
