# Yandex ID setup (Signet / smartvizitka.ru)

Код поддерживает OAuth 2.0 Authorization Code через `oauth.yandex.ru`
и профиль `login.yandex.ru/info`. Чтобы кнопка «Войти через Яндекс ID»
заработала, нужны ключи приложения Яндекс ID.

## 1. Создайте приложение

1. Откройте [Яндекс OAuth](https://oauth.yandex.ru/) / кабинет разработчика.
2. Создайте приложение для **веб-сервиса**.
3. В **Redirect URI** укажите точно:

```text
https://smartvizitka.ru/api/v1/auth/yandex/callback
```

Для локальной разработки добавьте второй URI:

```text
http://localhost:3000/api/v1/auth/yandex/callback
```

4. В **Suggest Hostname** укажите `smartvizitka.ru` (и при необходимости `localhost`).
5. Включите доступы к данным: `login:info`, `login:email`.
6. Скопируйте **Client ID** и **Client Secret**.

## 2. Пропишите секреты на VPS

На сервере (`/opt/myqrcards/.env.production`):

```bash
YANDEX_ID_CLIENT_ID=<client_id>
YANDEX_ID_CLIENT_SECRET=<client_secret>
YANDEX_ID_REDIRECT_URI=https://smartvizitka.ru/api/v1/auth/yandex/callback
```

Это **env-only** правка (без смены кода). Достаточно пересоздать API:

```bash
cd /opt/myqrcards
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate --no-deps api
```

Если параллельно менялся код `apps/*`, не делайте partial recreate — только полный
`./deploy/scripts/deploy.sh` (он всегда пересобирает **web** и **api**).

## 3. Локально

В корневом `.env`:

```bash
YANDEX_ID_CLIENT_ID=<client_id>
YANDEX_ID_CLIENT_SECRET=<client_secret>
YANDEX_ID_REDIRECT_URI=http://localhost:3000/api/v1/auth/yandex/callback
```

Перезапустите `npm run dev`.

## 4. Проверка

1. Откройте `/login` → «Войти через Яндекс ID».
2. Должен быть редирект на `https://oauth.yandex.ru/authorize?...`.
3. После согласия — возврат на `/dashboard` с сессионными cookie.
4. Повторный вход тем же аккаунтом не создаёт второго пользователя.

`YANDEX_ID_CLIENT_SECRET` никогда не кладите в git. Только `.env` /
`.env.production` (в `.gitignore`) или Cursor Secrets / VPS env.
