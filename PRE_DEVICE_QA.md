# VeloQuest 0.8.9 — pre-device QA

Date: 2026-08-15  
Source commit: `dc9b8ce9929d15dddf868958e60783a11c0c0245`

## Автоматические preflight-гейты

- Quality gate #178: PASS — https://github.com/SSSemyon/VeloQuest/actions/runs/31878680960
- iOS device candidate #68: PASS — https://github.com/SSSemyon/VeloQuest/actions/runs/31878680984
- Xcode 26.6, fresh Expo prebuild, locked CocoaPods и unsigned Release для `iphoneos`: PASS.
- Два чистых Supabase reset, pgTAP/RLS для двух пользователей и concurrency exactly-once: PASS.
- Candidate SHA-256: `6114b2ac7eb98b3931b747acad3cd506f8757f3c502946762c70dfcdbead52a3`.

## Бесплатная установка

Используйте Xcode Personal Team по `XCODE_DEVICE_INSTALL.md`. TestFlight и платная Apple Developer Program для личного QA не нужны.

## Обязательная device-матрица

На каждом устройстве укажите модель, OS, commit, дату, результат и ссылки на screenshots.

| Сценарий | iPhone | iPad portrait | Android phone | Android tablet portrait |
|---|---|---|---|---|
| Установка и cold start | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Email/password + recovery | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Google: success/cancel/deny/re-login | BLOCKED: credentials | BLOCKED | BLOCKED | BLOCKED |
| VK: success/cancel/replay/link conflict | BLOCKED: credentials | BLOCKED | BLOCKED | BLOCKED |
| Onboarding и источник поездок | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Health/FIT/GPX import | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Ride → H3 → quest → XP | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Achievements и exactly-once reward | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Duplicate/historical/GPS rejection | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Route Engine urban/regional + fallback | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Garage/catalog/search/compatibility | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Light/Dark + restart persistence | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Account isolation/unlink/delete | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| P0 visual defects | NOT RUN | NOT RUN | NOT RUN | NOT RUN |

## Stop conditions

- Чужие данные видны или изменяются.
- XP, achievement или cosmetic выдаются повторно либо за недоверенную поездку.
- Приватная стартовая/конечная зона появляется в серверной территории.
- OAuth callback принимает неверный scheme/host/state или повторный ticket.
- P0 crash, потеря данных, невозможность войти/выйти или удалить аккаунт.

Production остаётся нетронутым. Device QA не считается завершённым без реальных результатов и screenshots.
