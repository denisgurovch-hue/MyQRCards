# 03 — Задачи MVP MyQRCards

## Текущая задача: T-001 — Инфраструктура проекта

### Цель
Создать базовую монорепозиторную структуру MyQRCards с frontend, API,
PostgreSQL, Redis, Docker Compose и базовым CI.

### Scope
- Создать monorepo.
- Настроить Next.js в `apps/web`.
- Настроить NestJS в `apps/api`.
- Настроить PostgreSQL и Redis в Docker Compose.
- Настроить Prisma и первую миграцию.
- Добавить health check endpoints.
- Добавить базовые команды lint, test, build и dev.
- Создать `.env.example`.

### Вне scope
- Бизнес-логика визиток.
- Авторизация.
- UI-экраны.
- Аналитика.
- Продакшн-деплой.

### Acceptance criteria
- [ ] `docker compose up -d` поднимает PostgreSQL и Redis.
- [ ] `npm run dev` запускает frontend и API.
- [ ] `GET /api/v1/healthz` возвращает 200.
- [ ] `GET /readyz` проверяет доступность БД и Redis.
- [ ] `npm run lint` проходит без ошибок.
- [ ] `npm run test` проходит.
- [ ] Prisma migration применяется на чистой БД.

### Файлы
- `package.json`
- `docker-compose.yml`
- `.env.example`
- `apps/web/package.json`
- `apps/api/package.json`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/health/health.controller.ts`
- `README.md`
