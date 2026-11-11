# Analytics API (T-007)

## Owner analytics

```http
GET /api/v1/cards/{card_id}/analytics?period=7d|30d
Cookie: access session
```

- `401` if unauthenticated
- `404` if card missing or not owned
- `400` if `period` is not `7d` or `30d` (omitted → `7d`)

Response:

```json
{
  "period": "7d",
  "totals": {
    "card_views": 128,
    "contact_clicks": 34,
    "vcard_downloads": 11
  },
  "by_channel": {
    "phone": 12,
    "email": 4,
    "whatsapp": 9,
    "telegram": 6,
    "link": 3
  },
  "daily": [
    {
      "date": "2026-11-05",
      "card_views": 18,
      "contact_clicks": 5,
      "vcard_downloads": 2
    }
  ]
}
```

`daily` covers every UTC calendar day in the period (zeros included). Sums match `totals`.

Raw events, `visitor_hash`, IP, and User-Agent are never returned.

## Public contact click

```http
POST /api/v1/public/cards/{slug}/clicks
Content-Type: application/json

{ "channel": "phone" }
```

Allowed channels: `phone`, `email`, `whatsapp`, `telegram`, `link`.

- `204` on success (including swallowed analytics write failures)
- `404` if slug is not a published card
- `400` on invalid body

## Automatic server events

| Event | When |
|---|---|
| `card_view` | Successful `GET /api/v1/public/cards/{slug}` |
| `vcard_download` | Successful `GET /api/v1/public/cards/{slug}/vcard` (`channel=vcard`) |
