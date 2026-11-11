#!/usr/bin/env bash
# Dump Postgres from the production compose stack into ./backups/
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/myqrcards}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
KEEP="${KEEP:-14}"

cd "$APP_DIR"
mkdir -p backups

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="backups/postgres-${STAMP}.sql.gz"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-myqrcards}" "${POSTGRES_DB:-myqrcards}" \
  | gzip -c > "$OUT"

chmod 640 "$OUT"
echo "Wrote $OUT"

# Retention
ls -1t backups/postgres-*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
ls -lh "$OUT"
