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

- `Config/Debug.xcconfig` → `http://127.0.0.1:3001` (API), `http://127.0.0.1:3000` (public web)
- `Config/Release.xcconfig` → пропишите prod hosts перед TestFlight

Симулятор ходит на `127.0.0.1` хоста. Для устройства замените Debug URL на LAN IP Mac.

## Слои

- `Networking/` — `APIClient`, Keychain, Auth/Cards API
- `Features/Auth|Cards|Present|Editor|Account` — экраны v1
- `AppState` — сессия и bootstrap `GET /auth/me`

## Вне v1

Публичный `/u` для получателей, VK/Yandex OAuth, полный parity edit-v2 crop/align.
