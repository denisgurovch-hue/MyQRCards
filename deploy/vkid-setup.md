# VK ID setup (Signet / smartvizitka.ru)

Код уже поддерживает Authorization Code + PKCE через `id.vk.ru`.
Чтобы кнопка «Войти через VK ID» заработала, нужны ключи приложения VK ID.

## 1. Создайте приложение VK ID

1. Откройте [кабинет VK ID](https://id.vk.ru/about/business) / VK для бизнеса.
2. Создайте веб-приложение (конфиденциальное, обмен кода на бэкенде).
3. В настройках укажите **Trusted redirect URL** точно:

```text
https://smartvizitka.ru/api/v1/auth/vkid/callback
```

4. Включите доступ **email** (scope `email`), если нужен e-mail пользователя.
5. Скопируйте **Client ID** и **Client Secret** (защищённый ключ / service token).

Для локальной разработки добавьте второй redirect:

```text
http://localhost:3000/api/v1/auth/vkid/callback
```

## 2. Пропишите секреты на VPS

На сервере (`/opt/myqrcards/.env.production`):

```bash
VK_ID_CLIENT_ID=<client_id>
VK_ID_CLIENT_SECRET=<client_secret>
VK_ID_REDIRECT_URI=https://smartvizitka.ru/api/v1/auth/vkid/callback
```

Это **env-only** правка (без смены кода). Достаточно пересоздать API:

```bash
cd /opt/myqrcards
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate --no-deps api
```

Если параллельно менялся код `apps/*`, не делайте partial recreate — только полный `./deploy/scripts/deploy.sh` (он всегда пересобирает **web** и **api**).

## 3. Локально

В корневом `.env`:

```bash
VK_ID_CLIENT_ID=<client_id>
VK_ID_CLIENT_SECRET=<client_secret>
VK_ID_REDIRECT_URI=http://localhost:3000/api/v1/auth/vkid/callback
```

Перезапустите `npm run dev`.

## 4. Проверка

1. Откройте `/login` → «Войти через VK ID».
2. Должен быть редирект на `https://id.vk.ru/authorize?...`.
3. После согласия — возврат на `/dashboard` с сессионными cookie.

Если ключи пустые, authorize редиректит обратно на `/login?error=OAUTH_NOT_CONFIGURED`.

## Не коммитьте

`VK_ID_CLIENT_SECRET` никогда не кладите в git. Только `.env` / `.env.production` (в `.gitignore`).
