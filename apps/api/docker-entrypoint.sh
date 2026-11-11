#!/bin/sh
set -eu

echo "[api] applying prisma migrations…"
npx prisma migrate deploy --schema=prisma/schema.prisma

echo "[api] starting NestJS…"
exec node dist/main.js
