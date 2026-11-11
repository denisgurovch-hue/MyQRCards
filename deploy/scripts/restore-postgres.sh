#!/usr/bin/env bash
# Restore a gzipped pg_dump into the production Postgres service.
# WARNING: replaces data in POSTGRES_DB.
#   ./deploy/scripts/restore-postgres.sh backups/postgres-YYYYMMDDThhmmssZ.sql.gz
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/myqrcards}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
DUMP="${1:-}"

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 path/to/postgres-*.sql.gz" >&2
  exit 1
fi

cd "$APP_DIR"

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

echo "About to restore $DUMP into DB ${POSTGRES_DB:-myqrcards}."
echo "This will DROP/recreate the public schema objects via plain SQL dump restore."
read -r -p "Type RESTORE to continue: " confirm
if [[ "$confirm" != "RESTORE" ]]; then
  echo "Aborted."
  exit 1
fi

gunzip -c "$DUMP" \
  | docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    psql -U "${POSTGRES_USER:-myqrcards}" -d "${POSTGRES_DB:-myqrcards}"

echo "Restore finished. Restart api/web if needed:"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart api web"
