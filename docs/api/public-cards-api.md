# Public Cards API

## GET /api/v1/public/cards/{slug}

Returns a published, non-deleted card. No authentication.

### Headers
- Response: `Cache-Control: no-store`

### Response `200`

```json
{
  "card": {
    "slug": "ivan-ivanov",
    "displayName": "Иван Иванов",
    "jobTitle": "Руководитель проектов",
    "companyName": "Компания",
    "summary": "Цифровизация логистики",
    "photoUrl": null,
    "phone": "+79990000000",
    "email": null,
    "websiteUrl": "https://example.ru",
    "links": [
      { "type": "telegram", "label": "Telegram", "url": "https://t.me/example" }
    ]
  }
}
```

### Rules
- Separate PublicCardDto allowlist only.
- `email` is `null` when `showEmail=false`.
- Never returns `userId`, account email, `showEmail`, `status`, identities.
- Links ordered by `position`.
- Unknown / draft / archived / deleted / invalid slug → `404 CARD_NOT_FOUND`.
