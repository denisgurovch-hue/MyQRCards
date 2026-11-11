# Public QR API (T-005)

## GET /api/v1/public/cards/{slug}/qr.png

- Auth: none
- Body: PNG `1024×1024`, black on white, margin 4, ECC M
- Encodes: `{WEB_ORIGIN}/u/{slug}` (not from request Host)
- Headers: `Content-Type: image/png`, `Content-Disposition: attachment; filename="qrcard-{slug}.png"`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`
- Errors: JSON `404 CARD_NOT_FOUND` / `500` — never image body on error

## GET /api/v1/public/cards/{slug}/qr.svg

- Same access rules and payload URL as PNG
- Headers: `Content-Type: image/svg+xml; charset=utf-8`, attachment filename `qrcard-{slug}.svg`, `Cache-Control: no-store`

## Availability

Only `status=published` and `deleted_at IS NULL`. Draft, archived, deleted, unknown, and invalid slug share the same 404.
