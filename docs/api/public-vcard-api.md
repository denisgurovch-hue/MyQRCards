# Public vCard API (T-006 / T-014)

## GET /api/v1/public/cards/{slug}/vcard

- Auth: none (published cards only)
- Body: vCard 3.0 UTF-8 (CRLF), from `PublicCardDto` + canonical `{WEB_ORIGIN}/u/{slug}`
- Default headers (open / inline):
  - `Content-Type: text/vcard; charset=utf-8`
  - `Content-Disposition: inline; filename="contact-{slug}.vcf"`
  - `Cache-Control: no-store`
  - `X-Content-Type-Options: nosniff`
- Query `download=1` (explicit download / attachment):
  - Same body and `Content-Type` / cache / nosniff
  - `Content-Disposition: attachment; filename="contact-{slug}.vcf"`
- Query validation: omit `download` for inline; only `download=1` allowed for attachment; any other value → `400` JSON (`VALIDATION_ERROR`), not a `.vcf` body
- Filename is derived from the card slug only (not from the request)
- Analytics: successful response records `vcard_download` (`channel=vcard`) via T-007; write failures must not break download
- Platform note: `inline` asks the browser/OS to handle the file; it does **not** guarantee opening the Contacts app on every Android device
