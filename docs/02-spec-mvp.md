# 02 — Техническая спецификация MVP MyQRCards

## Метаданные

| Поле | Значение |
|---|---|
| Название | MyQRCards MVP — Implementation Plan |
| Версия | 0.1 |
| Статус | Draft |
| Дата | 2026-11-10 |
| Продуктовая спецификация | `docs/specs/01-spec-mvp.md` |
| Владелец | [Имя] |
| Целевой результат | Работающий MVP: аккаунты, создание визиток, публичная страница, QR, vCard, базовая аналитика |

## 1. Цель документа

Документ определяет, **как** реализуется MVP MyQRCards: архитектуру, границы модулей, модель данных, API-контракты, интеграции, безопасность, наблюдаемость и стратегию тестирования.

Документ не заменяет `01-spec-mvp.md`: он не меняет пользовательские сценарии и acceptance criteria, а определяет технические решения для их выполнения.

## 2. Технический контекст

| Параметр | Решение |
|---|---|
| Тип продукта | Mobile-first web application / PWA |
| Целевая платформа | Современные мобильные и десктопные браузеры |
| Frontend | Next.js 15+ (App Router), TypeScript, React Server Components |
| UI | Tailwind CSS + shadcn/ui либо эквивалентная компонентная библиотека |
| Backend | NestJS + TypeScript |
| БД | PostgreSQL 16+ |
| ORM / миграции | Prisma |
| Кэш и rate limiting | Redis |
| Файловое хранилище | S3-совместимое объектное хранилище |
| Авторизация | E-mail + пароль; VK ID и/или Яндекс ID |
| QR-коды | Серверная генерация SVG/PNG |
| vCard | Серверная генерация `.vcf` |
| Тесты | Vitest/Jest, Supertest, Playwright |
| Инфраструктура | Docker Compose локально; Docker + Nginx на VPS |
| Наблюдаемость | Structured JSON logs, request ID, health checks |

## 3. Архитектура

### 3.1 Высокоуровневая схема

```text
Браузер / PWA
      |
      v
Next.js Frontend
      |
      v
NestJS API
      |----------- PostgreSQL
      |----------- Redis
      |----------- Object Storage
      |----------- VK ID / Yandex ID
      |
      v
Публичная страница визитки /u/{slug}
```

### 3.2 Публичная страница визитки (T-004)

| Решение | Значение |
|---|---|
| Публичный доступ | Только `status=published` и `deleted_at IS NULL` |
| Недоступные карточки | Единый `404 CARD_NOT_FOUND` (draft/archived/deleted/unknown slug) |
| Публичный API | `GET /api/v1/public/cards/{slug}` без сессии; отдельный PublicCardDto |
| Кэш | `Cache-Control: no-store`; без ISR/SSG и межзапросного кэша данных карточки |
| Индексация | Временно `robots: noindex, nofollow` |
| Приватность e-mail | При `showEmail=false` поле `email` в публичном ответе всегда `null` |
| Канонический URL | `{PUBLIC_APP_URL}/u/{slug}` (`NEXT_PUBLIC_APP_URL` / `WEB_ORIGIN`) |

### 3.3 QR-код визитки (T-005)

| Решение | Значение |
|---|---|
| Содержимое QR | Только canonical URL `/u/{slug}` (без UTM, токенов, PII) |
| Генерация | Серверная (`qrcode`), без внешних API и без хранения файлов |
| Форматы | PNG `1024×1024`; SVG с `viewBox` |
| Стиль | Чёрный на белом; `margin=4`; ECC `M`; без query-параметров стиля |
| Доступ | Только `published` + `deleted_at IS NULL`; sessionless |
| Endpoints | `GET /api/v1/public/cards/{slug}/qr.png` и `.../qr.svg` |
| Кэш | `Cache-Control: no-store` (не `public, max-age=86400`) |
| Базовый URL | Существующий `WEB_ORIGIN` на API (согласован с `NEXT_PUBLIC_APP_URL`); не из `Host` |
| Старые slug | Без редиректов в T-005 |
