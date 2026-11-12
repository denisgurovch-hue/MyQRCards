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

### 3.3.1 Презентационный экран владельца (T-013)

| Решение | Значение |
|---|---|
| Действие в кабинете | «Показать визитку» (заменяет отдельный диалог «QR-код» / «Показать QR код») |
| Маршрут | Приватный `/cards/[id]/present` (id карточки, не slug); `force-dynamic`, без общего кэша |
| Доступ | Только владелец через существующий `GET /api/v1/cards/{id}` + `AuthGuard`; без сессии → login; чужая/удалённая/неизвестная → единый 404 |
| Публичная страница | Без изменений: «Открыть визитку» и QR ведут на `/u/{slug}` |
| Контакты | Правила публичной видимости (`showEmail=false` скрывает email даже владельцу на этом экране) |
| Published | В карточке показывается QR (через существующие endpoints); URL кодирует `/u/{slug}` |
| Draft / archived | Предпросмотр карточки без QR |
| Owner tools on present | Без PNG/SVG/«Открыть визитку»/копирования ссылки на самом презентационном экране — эти действия остаются в кабинете |
| QR-сервис | Без новых endpoints; генерация T-005 сохраняется |

### 3.4 vCard (T-006)

| Решение | Значение |
|---|---|
| Формат | vCard 3.0, UTF-8, CRLF; `FN` + `N:{displayName};;;;` без авто-разбора ФИО |
| Источник данных | Только `PublicCardDto` + canonical URL; не Prisma entity / не e-mail аккаунта |
| Поля | FN, N, ORG?, TITLE?, TEL;TYPE=VOICE?, EMAIL;TYPE=INTERNET?, URL? (сайт), URL (canonical), NOTE? |
| Не экспортировать | фото, CardLink, скрытый email, userId, сессии, Identity |
| Доступ | Только `published` + `deleted_at IS NULL`; sessionless `GET /api/v1/public/cards/{slug}/vcard` |
| Кэш / хранение | `Cache-Control: no-store`; файлы не сохраняются |
| Аналитика | Событие `contact_save` **не** входит в T-006 |
| UI | Кнопка «Сохранить контакт»; без сообщения «Контакт сохранён» |

### 3.5 Базовая аналитика (T-007)

| Решение | Значение |
|---|---|
| Хранение | Таблица `card_events` (UUID): `card_id`, `event_type`, `channel`, `occurred_at`, `day`, `visitor_hash` (nullable, не используется для дедупа в MVP) |
| События | `card_view` (GET public card 200), `contact_click` (POST public clicks), `vcard_download` (успешный `.vcf`) |
| Каналы клика | `phone`, `email`, `whatsapp`, `telegram`, `link`; для vCard — `vcard`; для view — `null` |
| Privacy | Не хранить IP, User-Agent, query URL, PII; ошибка записи не ломает public/QR/vCard |
| Owner API | `GET /api/v1/cards/{card_id}/analytics?period=7d\|30d` → `totals`, `by_channel`, `daily` |
| Доступ | Только владелец; чужая карточка `404`; без auth `401` |
| Public click | `POST /api/v1/public/cards/{slug}/clicks` body `{ "channel": "..." }` → `204` |
| UI | Блок «Аналитика» в кабинете: метрики, период 7/30, каналы, таблица по дням, empty/loading/error |

### 3.6 Загрузка фото (T-012)

| Решение | Значение |
|---|---|
| Хранение | Локальный диск (`CARD_PHOTO_STORAGE_DIR` / `storage/card-photos`), вне webroot |
| Таблица | `card_photos` + `cards.photo_id`; публичный `photoUrl` = `{WEB_ORIGIN}/api/v1/media/cards/{uuid}.webp` |
| Вход | JPEG/PNG/WebP ≤ 5 MB; ≤ 4000×4000; magic-bytes + sharp decode; иначе 400 |
| Выход | Одна WebP без EXIF/GPS; оригинал не сохраняется; имя файла только UUID |
| API | `POST/DELETE /api/v1/cards/{id}/photo` (владелец); `GET /api/v1/media/cards/{key}` sessionless |
| Доступ | Чужая карточка `404`; без auth `401`; ошибка загрузки не меняет карточку |
| UI | Блок «Фото» в редакторе: preview, pan/zoom в рамке, upload/replace/adjust/delete; публичный placeholder с инициалами |
| Кроп | Только клиентский квадратный crop перед upload; сервер по-прежнему принимает JPEG/PNG/WebP и сохраняет WebP |

### 3.7 Обложка публичной страницы

| Решение | Значение |
|---|---|
| Назначение | Верхняя полоса фона только на `/u/{slug}` (не на `/cards/[id]/present`) |
| Поля | `cards.cover_color` (hex `#RGB`/`#RRGGBB`), `cover_image_url`, `cover_photo_id` → `card_photos` |
| Приоритет | Изображение > цвет > дефолтный градиент Signet |
| Цвет | Любой color picker в редакторе; `PATCH /api/v1/cards/{id}` с `coverColor` (или `null` для сброса) |
| Изображение | Те же лимиты/пайплайн, что T-012; `POST/DELETE /api/v1/cards/{id}/cover` (multipart field `cover`); media через существующий `GET /api/v1/media/cards/{key}` |
| Кадрирование | Как у фото профиля (T-012): pan/zoom в прямоугольной рамке обложки на клиенте, затем JPEG → серверный WebP |
| UI | Блок «Обложка публичной страницы» только в редакторе карточки; кнопки «Подогнать» / сохранить обложку |
