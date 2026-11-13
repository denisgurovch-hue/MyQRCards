# Card photos API (T-012 / T-015)

Owner UI uses **model B**: upload/delete happen via these endpoints immediately («Сохранить фото» / «Удалить»), independent of the card text `PATCH`. The editor applies a client-side square crop first; the API still validates the uploaded bytes (not a stored original). Clients also gate source files to JPEG/PNG/WebP ≤5 MB and ≤4000×4000 before opening the crop UI.

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
