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
