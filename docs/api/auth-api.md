# Auth API

Base path: `/api/v1`

Session cookies (never returned in JSON):

- `mq_access` — JWT access token, 15 minutes, HttpOnly, SameSite=Lax, Secure in production
- `mq_refresh` — opaque refresh token, 30 days, HttpOnly, SameSite=Lax, Secure in production

Error shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": null
  }
}
```

## POST /auth/register

Creates a user with e-mail and password and establishes a session.

### Request

```json
{
  "email": "user@example.com",
  "password": "StrongPassphrase123!",
  "displayName": "Иван Иванов"
}
```

### Response `201`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Иван Иванов"
  }
}
```

### Errors

- `400 VALIDATION_ERROR`
- `409 EMAIL_ALREADY_EXISTS`
- `429 RATE_LIMITED`

## POST /auth/login

### Request

```json
{
  "email": "user@example.com",
  "password": "StrongPassphrase123!"
}
```

### Response `200`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Errors

- `400 VALIDATION_ERROR`
- `401 INVALID_CREDENTIALS`
- `429 RATE_LIMITED`

## POST /auth/logout

Revokes the current refresh token and clears session cookies.

### Response `204`

## GET /auth/me

Returns the current authenticated user. Requires valid access cookie.
If the user row no longer exists, returns `401` (deleted account).

### Response `200`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Иван Иванов",
    "hasPassword": true
  }
}
```

### Errors

- `401 UNAUTHORIZED`

## PATCH /auth/me

Updates account `displayName` only. Does not change card fields.

### Request

```json
{
  "displayName": "Новое имя"
}
```

### Response `200`

Same shape as `GET /auth/me`.

### Errors

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`

## POST /auth/password

Changes password for accounts that already have `passwordHash`.
Verifies `currentPassword`, revokes all refresh tokens, and reissues session cookies.

### Request

```json
{
  "currentPassword": "StrongPassphrase123!",
  "newPassword": "AnotherStrongPass123!"
}
```

### Response `200`

Same shape as `GET /auth/me` (`hasPassword: true`). Sets new session cookies.

### Errors

- `400 VALIDATION_ERROR`
- `400 PASSWORD_NOT_SET`
- `401 INVALID_CREDENTIALS` / `UNAUTHORIZED`
- `429 RATE_LIMITED`

## POST /auth/account/delete

Hard-deletes the authenticated account after exact confirmation `Удалить`.
Cascades identities, refresh tokens, cards and related rows; best-effort unlinks card photo files; clears session cookies.

### Request

```json
{
  "confirmation": "Удалить"
}
```

### Response `204`

### Errors

- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `429 RATE_LIMITED`

## GET /auth/vkid/authorize

Starts VK ID OAuth Authorization Code + PKCE flow.

### Response `302`

Redirect to VK ID authorize URL with:

- `response_type=code`
- `client_id`
- `redirect_uri`
- `state`
- `code_challenge`
- `code_challenge_method=S256`

## GET /auth/vkid/callback

Handles VK ID redirect.

### Query

Either flat params:

- `code`
- `state`
- `device_id`

or VK ID Web `payload` JSON (preferred by current VK docs):

- `payload={"code":"...","state":"...","type":"code_v2","device_id":"..."}`

### Response `302`

Redirect to `/dashboard` after successful login. Sets session cookies.
On failure redirects to `/login?error=...`.

### Errors

- `400 OAUTH_INVALID_STATE`
- `400 OAUTH_INVALID_CODE`
- `429 RATE_LIMITED`
- `502 OAUTH_PROVIDER_ERROR`
- `503 OAUTH_NOT_CONFIGURED` (missing `VK_ID_CLIENT_ID`)

## GET /auth/yandex/authorize

Starts Yandex ID OAuth Authorization Code flow.

### Response `302`

Redirect to Yandex OAuth authorize URL with:

- `response_type=code`
- `client_id`
- `redirect_uri`
- `state`
- `scope=login:info login:email`

## GET /auth/yandex/callback

Handles Yandex ID redirect.

### Query

- `code`
- `state`
- `error` (optional)

### Response `302`

Redirect to `/dashboard` after successful login. Sets session cookies.
On failure redirects to `/login?error=...`.

### Errors

- `400 OAUTH_INVALID_STATE`
- `400 OAUTH_INVALID_CODE`
- `429 RATE_LIMITED`
- `502 OAUTH_PROVIDER_ERROR`
- `503 OAUTH_NOT_CONFIGURED` (missing `YANDEX_ID_CLIENT_ID` / `YANDEX_ID_CLIENT_SECRET`)
