# Cards API (owner)

Base path: `/api/v1/cards`  
Auth: session cookies (`mq_access`). All endpoints require authentication.

OpenAPI: `docs/api/openapi-cards.yaml`

## POST /cards

Create a card for the current user. Status is always `draft`. `showEmail` defaults to `false`.

### Request

```json
{
  "displayName": "Denis Gurov",
  "jobTitle": "Engineer",
  "companyName": "MyQRCards",
  "summary": "Digital cards",
  "phone": "+79990001122",
  "email": "denis@example.com",
  "showEmail": false,
  "websiteUrl": "https://example.com",
  "photoUrl": "https://example.com/photo.jpg",
  "slug": "denis-gurov",
  "links": [
    { "label": "Telegram", "url": "https://t.me/denis", "type": "telegram", "position": 0 }
  ]
}
```

Forbidden body fields: `userId`, `status`, `id`, `deletedAt`.

### Responses

- `201` `{ "card": { ... } }`
- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`
- `409 SLUG_ALREADY_EXISTS`

## GET /cards?page=1&limit=20

List current user's non-deleted cards.

### Response `200`

```json
{
  "items": [{ "id": "uuid", "displayName": "...", "slug": "...", "status": "draft", "showEmail": false, "links": [] }],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

## GET /cards/:id

Owner read for editor. Missing card and another user's card both return `404 NOT_FOUND`.

## PATCH /cards/:id

Partial update. Changing `displayName` does **not** change `slug`. Providing `links` replaces the full ordered list.

## POST /cards/:id/publish

Sets status to `published`.

## POST /cards/:id/unpublish

Sets status to `draft`.

## POST /cards/:id/archive

Sets status to `archived`.

## DELETE /cards/:id

Soft delete (`deleted_at`). Response `204`. Soft-deleted cards disappear from list/get/edit.
