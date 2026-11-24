# Signet iOS (owner cabinet)

Нативное SwiftUI-приложение кабинета владельца. API: Nest `/api/v1` с Bearer-токенами (`X-Auth-Tokens: 1`). Контракт: [`docs/ios-owner-api.md`](../../docs/ios-owner-api.md).

## Требования

- macOS + Xcode 15+
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)
- Локально: `npm run dev` (web `:3000`, api `:3001`)

## Генерация Xcode-проекта

```bash
cd apps/ios
xcodegen generate
open Signet.xcodeproj
```

`Signet.xcodeproj` в git не коммитится — генерируется из `project.yml`.

## Конфиг

- `Config/Debug.xcconfig` → `http://127.0.0.1:3001` (API host), `http://127.0.0.1:3000` (public web)
- `Signet/Info.plist` подставляет эти значения и разрешает cleartext к `127.0.0.1` / `localhost` (ATS)
- `Config/Release.xcconfig` → пропишите prod hosts перед TestFlight

Симулятор ходит на `127.0.0.1` Mac. Для физического устройства замените Debug URL на LAN IP Mac.

### Локальный запуск (Simulator)

```bash
# терминал 1 — API+web (из корня репо)
cd ~/MyQRCards && npm run dev

# smoke API
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/api/v1/auth/me
# ожидайте 401 (сервер жив)

# терминал 2 — Xcode
cd ~/MyQRCards/apps/ios && ./generate-xcodeproj.sh && open Signet.xcodeproj
```

Scheme: **Signet** / destination **iPhone Simulator**. Register бьёт в  
`POST http://127.0.0.1:3001/api/v1/auth/register` с `X-Auth-Tokens: 1`.

## Слои

- `Networking/` — `APIClient`, Keychain, Auth/Cards API
- `Features/Auth|Cards|Present|Editor|Account` — экраны v1
- `AppState` — сессия и bootstrap `GET /auth/me`

## Вне v1

Публичный `/u` для получателей, VK/Yandex OAuth, полный parity edit-v2 crop/align.
