# Admin API

Platform metrics for allowlisted main administrators.
Requires session cookies and email ∈ `ADMIN_USER_EMAILS`.

## GET /admin/metrics

### Query

| Param | Values | Default |
|---|---|---|
| `period` | `7`, `30`, `all` | `all` |

### Response `200`

```json
{
  "period": "all",
  "usersTotal": 10,
  "usersNew": 2,
  "cardsTotal": 8,
  "cardsNew": 3,
  "cardsByStatus": { "draft": 2, "published": 5, "archived": 1 },
  "cardsPublishedNow": 5,
  "eventsViews": 100,
  "eventsClicks": 40,
  "eventsVcard": 12,
  "authProviders": { "password": 4, "vkid": 3, "yandex": 2, "other": 0 }
}
```

Soft-deleted cards (`deletedAt != null`) are excluded from card counts.
Response contains aggregates only — no user emails, phones, or tokens.

### Errors

- `401 UNAUTHORIZED`
- `403 ADMIN_FORBIDDEN`
- `400 VALIDATION_ERROR` (invalid `period`)
- `429 RATE_LIMITED`
