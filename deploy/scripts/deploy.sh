#!/usr/bin/env bash
# Deploy / update MyQRCards on a provisioned VPS.
# Run from the app directory (default /opt/myqrcards) as the deploy user.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/myqrcards}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $APP_DIR/$ENV_FILE — copy from .env.production.example and fill secrets." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# Export only keys needed for compose build args / interpolation
# (compose also loads env_file into containers)
source "$ENV_FILE"
set +a

if [[ -z "${NEXT_PUBLIC_APP_URL:-}" || -z "${WEB_ORIGIN:-}" ]]; then
  echo "NEXT_PUBLIC_APP_URL and WEB_ORIGIN must be set." >&2
  exit 1
fi
if [[ "${NEXT_PUBLIC_APP_URL}" != "${WEB_ORIGIN}" ]]; then
  echo "NEXT_PUBLIC_APP_URL and WEB_ORIGIN must be identical (got '$NEXT_PUBLIC_APP_URL' vs '$WEB_ORIGIN')." >&2
  exit 1
fi
if [[ "${NEXT_PUBLIC_APP_URL}" == *"localhost"* ]]; then
  echo "Refusing deploy with localhost public origin." >&2
  exit 1
fi
# Allow https://domain before DNS/SSL is live (smoke via IP Host header).
# Cookies with COOKIE_SECURE=true require working HTTPS.

if [[ -d .git ]]; then
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "Waiting for health…"
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:3001/api/v1/healthz" >/dev/null \
    && curl -fsS "http://127.0.0.1:3000/" >/dev/null; then
    echo "Deploy healthy."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    exit 0
  fi
  sleep 2
done

echo "Health check timed out." >&2
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=80
exit 1
