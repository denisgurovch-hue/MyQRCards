# TestFlight / smoke checklist (iOS owner v1)

## Перед сборкой

- [ ] Release `API_BASE_URL` / `PUBLIC_WEB_BASE_URL` указывают на staging или prod HTTPS
- [ ] Privacy Nutrition Labels: Photo Library, Camera (если используется), Network
- [ ] Bundle id `app.signet.owner`, версия Marketing/Build заполнены
- [ ] `xcodegen generate` → Archive в Xcode → Upload to TestFlight

## Smoke

1. Регистрация (ФИО + email + пароль) → попадание на список визиток
2. Выход → логин теми же данными
3. Создать визитку (фамилия/имя, телефон, email, slug)
4. Загрузить фото (после первого Save)
5. Опубликовать → статус «Опубликовано»
6. Показать → QR виден; Share ссылки `/u/{slug}`
7. Снять с публикации → QR недоступен
8. Удалить с подтверждением → карточка исчезает
9. Аккаунт: сменить displayName; сменить пароль; (опционально) удаление аккаунта

## Не тестируем в v1

- VK / Yandex ID
- In-app публичный просмотр как у гостя
- Cover crop / avatar align как в edit-v2 web
