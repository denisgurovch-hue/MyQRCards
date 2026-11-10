# MyQRCards

Digital business cards with a public page, QR code, vCard, and basic analytics.

## Stack

- `apps/web` — Next.js (App Router)
- `apps/api` — NestJS + Prisma
- PostgreSQL 16 + Redis via Docker Compose

## Prerequisites

- Node.js 20+
- Docker + Docker Compose  
  On macOS without Docker Desktop: `brew install colima docker docker-compose`, then `colima start`.  
  Ensure Compose plugin discovery:

  ```json
  // ~/.docker/config.json
  { "cliPluginsExtraDirs": ["/opt/homebrew/lib/docker/cli-plugins"] }
  ```

## Quick start

```bash
cp .env.example .env
ln -sf ../../.env apps/api/.env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```


- Web: http://localhost:3000
- API liveness: http://localhost:3001/api/v1/healthz
- API readiness: http://localhost:3001/readyz

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start web + API |
| `npm run lint` | Lint all workspaces |
| `npm run test` | Run unit tests |
| `npm run build` | Build API and web |
| `npm run prisma:migrate` | Apply Prisma migrations |

## Current task

See `docs/03-tasks-mvp.md` (T-001 infrastructure).
