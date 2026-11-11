# Deploy access status

## Target

| Item | Value |
|---|---|
| SSH | `ubuntu@77.91.73.109` |
| Domain | `smartvizitka.ru` (+ `www`) |
| Public origin | `https://smartvizitka.ru` |
| App dir | `/opt/myqrcards` |

## Status

| Need | Status |
|---|---|
| SSH key auth | OK (`ubuntu`) |
| DNS A → `77.91.73.109` | OK (apex + www) |
| Provision / Docker / Nginx | See runbook |
| Certbot HTTPS | After first deploy |
| Phone QR scan | Not marked done until manually verified |

## Env invariants

- `NEXT_PUBLIC_APP_URL` === `WEB_ORIGIN` === `https://smartvizitka.ru`
- `COOKIE_SECURE=true`
- `VK_ID_REDIRECT_URI=https://smartvizitka.ru/api/v1/auth/vkid/callback`
