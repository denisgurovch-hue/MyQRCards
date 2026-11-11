# Public vCard API (T-006)

## GET /api/v1/public/cards/{slug}/vcard

- Auth: none
- Body: vCard 3.0 UTF-8 (CRLF), from `PublicCardDto` + canonical `{WEB_ORIGIN}/u/{slug}`
- Headers: `Content-Type: text/vcard; charset=utf-8`, `Content-Disposition: attachment; filename="contact-{slug}.vcf"`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`
- Email: only when public projection includes email (`showEmail=true`); never account email
- Out of scope: photo, CardLink, `contact_save` analytics, file storage
