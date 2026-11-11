# Phone acceptance checklist (QR + vCard)

Mark items only when actually performed on a real device against the **public HTTPS** origin.

**Current staging/prod URL:** `https://smartvizitka.ru`  
**Sample published slug (smoke):** `/u/smoke-4417136`  
**Phone scan / import status:** NOT verified in agent runs.

## Preconditions

- [x] DNS + TLS live (`https://smartvizitka.ru/`)
- [x] `.env.production` has identical `NEXT_PUBLIC_APP_URL` and `WEB_ORIGIN`
- [x] Web image rebuilt after setting those URLs
- [x] Published card exists (`smoke-4417136`)

## Automatable (from laptop / CI against staging URL)

```bash
DOMAIN=https://cards.example.com
SLUG=your-published-slug

curl -fsS -o /dev/null -w "%{http_code}\n" "$DOMAIN/"
curl -fsS "$DOMAIN/api/v1/healthz"
curl -fsS -D- -o /tmp/card.vcf "$DOMAIN/api/v1/public/cards/$SLUG/vcard" | tr -d '\r' | grep -Ei 'content-type: text/vcard|cache-control: no-store'
curl -fsS -D- -o /tmp/qr.png "$DOMAIN/api/v1/public/cards/$SLUG/qr.png" | tr -d '\r' | grep -Ei 'content-type: image/png|cache-control: no-store'
# Decode PNG and assert payload == "$DOMAIN/u/$SLUG" (use project unit approach or zbarimg/jsQR)
```

- [ ] Home 200
- [ ] healthz OK
- [ ] vCard headers + body parse
- [ ] QR PNG headers
- [ ] Decoded QR equals `$DOMAIN/u/$SLUG` exactly

## iOS (manual — not done until checked)

Device / iOS version / Contacts app: ________________

- [ ] Camera scan of on-screen QR opens Safari to `https://<domain>/u/<slug>` **without VPN**
- [ ] Page shows public card (no login)
- [ ] «Сохранить контакт» opens `.vcf` → Add Contact
- [ ] Imported: name, phone, company, title, URLs; email only if public
- [ ] After unpublish: page/QR/vCard unavailable (404)

**Status: NOT verified in automation runs.**

## Android (manual — not done until checked)

Device / Android version / Contacts app: ________________

- [ ] Camera / Google Lens scan opens Chrome to public card
- [ ] vCard download/import into Contacts with same field checks
- [ ] Unpublish → 404

**Status: NOT verified in automation runs.**
