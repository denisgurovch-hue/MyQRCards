#!/usr/bin/env bash
# Deploy / update MyQRCards on a provisioned VPS.
# Always rebuilds and recreates BOTH api and web — do not replace this with
# a partial `docker compose up … api` after frontend/backend code changes.
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

GIT_SHA="$(git rev-parse HEAD)"
export GIT_SHA
echo "Deploying branch=${BRANCH} sha=${GIT_SHA}"

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

# Explicit app rebuild — Next bakes UI into the web image; git pull alone is not enough.
compose build api web
# Keep data services up; always recreate app containers onto the new images.
compose up -d --remove-orphans postgres redis
compose up -d --force-recreate --no-deps api web

echo "Waiting for health and build markers…"
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:3001/api/v1/healthz" >/dev/null \
    && curl -fsS "http://127.0.0.1:3000/" >/dev/null \
    && curl -fsS "http://127.0.0.1:3000/build-id.txt" >/dev/null; then
    web_id="$(curl -fsS "http://127.0.0.1:3000/build-id.txt" | tr -d '[:space:]')"
    api_sha="$(
      curl -fsS "http://127.0.0.1:3001/api/v1/healthz" \
        | python3 -c 'import sys, json; print(json.load(sys.stdin).get("gitSha", ""))'
    )"
    if [[ "$web_id" != "$GIT_SHA" ]]; then
      echo "web build-id mismatch: got '${web_id}' want '${GIT_SHA}'" >&2
      compose ps
      compose logs --tail=80 web
      exit 1
    fi
    if [[ "$api_sha" != "$GIT_SHA" ]]; then
      echo "api gitSha mismatch: got '${api_sha}' want '${GIT_SHA}'" >&2
      compose ps
      compose logs --tail=80 api
      exit 1
    fi
    echo "Deploy healthy (web+api @ ${GIT_SHA})."
    compose ps
    exit 0
  fi
  sleep 2
done

echo "Health check timed out." >&2
compose ps
compose logs --tail=80
exit 1
