# Owner API for iOS

Контракт кабинета владельца для нативного клиента Signet.
Базовый префикс: `/api/v1`. Ошибки: `{ "error": { "code", "message", "details?" } }`.

## Auth (Bearer)

Web по-прежнему использует httpOnly cookies. Native клиент:

1. Шлёт заголовок `X-Auth-Tokens: 1` на `register` / `login` / `refresh`.
2. Сохраняет `accessToken` и `refreshToken` (Keychain).
3. На защищённых запросах: `Authorization: Bearer <accessToken>`.
4. При 401 — `POST /auth/refresh` с `{ "refreshToken" }`, затем повтор.

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/register` | body: email, password, lastName, firstName, patronymic? → `{ user, accessToken?, refreshToken? }` |
| POST | `/auth/login` | body: email, password → `{ user, accessToken?, refreshToken? }` |
| POST | `/auth/refresh` | body: `{ refreshToken? }` или cookie → `{ user, accessToken?, refreshToken? }` |
| POST | `/auth/logout` | body: `{ refreshToken? }` или cookie → 204 |
| GET | `/auth/me` | Bearer/cookie → `{ user }` |
| PATCH | `/auth/me` | profile fields |
| POST | `/auth/password` | change password |
| POST | `/auth/account/delete` | `{ confirmation: "Удалить" }` |

VK/Yandex OAuth в iOS v1 не используются.

## Cards (owner)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/cards?page&limit` | list |
| POST | `/cards` | create |
| GET | `/cards/:id` | detail |
| PATCH | `/cards/:id` | update |
| POST | `/cards/:id/publish` | |
| POST | `/cards/:id/unpublish` | |
| POST | `/cards/:id/archive` | |
| DELETE | `/cards/:id` | soft delete |
| POST | `/cards/:id/photo` | multipart field `photo` |
| DELETE | `/cards/:id/photo` | |
| POST | `/cards/:id/cover` | multipart field `cover` |
| DELETE | `/cards/:id/cover` | |
| GET | `/cards/:id/analytics` | |

## Public helpers (owner present/QR)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/public/cards/:slug/qr.png` | published only |
| GET | `/public/cards/:slug` | optional preview |

Публичная страница получателя остаётся web `/u/{slug}`.
