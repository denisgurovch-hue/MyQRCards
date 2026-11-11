# Card photos API (T-012)

## Upload

```http
POST /api/v1/cards/{card_id}/photo
Content-Type: multipart/form-data
Cookie: access session

photo: <jpeg|png|webp file>
```

Success `201`:

```json
{
  "photo": {
    "id": "uuid",
    "url": "https://example.com/api/v1/media/cards/<uuid>.webp",
    "width": 800,
    "height": 800,
    "mime_type": "image/webp"
  }
}
```

Errors: `401`, `404` (foreign/missing card), `400` (type/size/dimensions).

## Delete

```http
DELETE /api/v1/cards/{card_id}/photo
```

Success `200`: `{ "photo": null }`

## Public media

```http
GET /api/v1/media/cards/{uuid}.webp
```

Sessionless. Returns `image/webp` or `404`. Does not expose storage paths or original filenames.
