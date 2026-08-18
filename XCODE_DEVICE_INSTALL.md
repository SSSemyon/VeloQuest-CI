# VeloQuest 0.8.9 — установка на iPhone или iPad через Xcode

## Бесплатный путь

Для личного device QA достаточно бесплатного Apple ID и Xcode Personal Team. TestFlight, EAS и платная Apple Developer Program не нужны.

Проверенный исходный commit: `dc9b8ce9929d15dddf868958e60783a11c0c0245`.

Unsigned candidate из CI подтверждает чистую компиляцию, но не устанавливается напрямую без подписи:

- `~/VeloQuest-builds/dc9b8ce9929d15dddf868958e60783a11c0c0245/VeloQuest-0.8.9-unsigned-device-candidate.zip`
- SHA-256: `6114b2ac7eb98b3931b747acad3cd506f8757f3c502946762c70dfcdbead52a3`

## Требования

- Mac с Xcode 26.6 или совместимой стабильной версией.
- Бесплатный Apple ID в Xcode → Settings → Accounts.
- iPhone или iPad с Developer Mode.
- Node.js 24 и CocoaPods из Homebrew.

## Подготовка

В корне checkout ветки `agent/auth-achievements-0.8.9`:

```bash
git rev-parse HEAD
npm ci
EXPO_NO_TELEMETRY=1 npx expo prebuild --platform ios --clean
cd ios
pod install
open VeloQuest.xcworkspace
```

Ожидаемая версия: 0.8.9, build 9. Открывайте `VeloQuest.xcworkspace`, не `.xcodeproj`.

## Подпись Personal Team

1. Выберите project и target `VeloQuest`.
2. Signing & Capabilities → Automatically manage signing.
3. Team → ваш Personal Team.
4. Если bundle ID занят, задайте уникальный `com.<ваше-имя>.veloquest.dev`.
5. URL scheme `veloquest` не меняйте.
6. Убедитесь, что HealthKit capability присутствует.

## Установка

1. Подключите устройство, подтвердите Trust и выберите его как run destination.
2. Включите Settings → Privacy & Security → Developer Mode.
3. Нажмите Run (`⌘R`).
4. При запросе разрешите профиль в Settings → General → VPN & Device Management.

Бесплатная подпись периодически истекает; приложение потребуется снова запустить из Xcode. Это ограничение Personal Team, не VeloQuest.

## Перед отметкой PASS

Зафиксируйте устройство, версию iOS/iPadOS, commit, Light/Dark screenshots и результаты сценариев из `PRE_DEVICE_QA.md`. Не вводите OAuth-секреты в приложение, Xcode build settings, исходники или скриншоты.
