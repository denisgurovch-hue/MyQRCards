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

### Response `200`

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

- `401 UNAUTHORIZED`

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
