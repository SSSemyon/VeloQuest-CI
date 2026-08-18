# Superseded: VeloQuest 0.8.2 — итоговый функциональный и Garage-аудит

> Этот снимок сохранён для трассировки. Текущий проверенный checkpoint — 0.8.3; см. `RC_0_8_3.md`. Утверждения ниже описывают более раннее состояние 0.8.2.

Дата: 2026-08-11  
Статус: исходники RC готовы; production rollout и заявление о полном наполнении Garage не одобрены.

## Резюме

- Критические P0 по изоляции аккаунтов, активному квесту и защите XP при ручном GPX/FIT закрыты.
- Release-gate исходников проходит: TypeScript, 12 regression/unit-тестов, type-check всех 7 Edge Functions, SQL parse, backend static audit, catalog manifest, Garage-аудит, iOS и Android export.
- Базовый каталог воспроизводим и совпадает с live: 668 строк, 663 активны, 43 бренда, 2020–2026.
- Ширина каталога достаточна для alpha, но глубина Garage существенно ниже максимальных критериев. Полное factory/compatibility coverage заявлять нельзя.
- Production не изменялся. До rollout обязательны backup, проверка drift, migration repair baseline, dry-run hardening, деплой двух Edge Functions и device QA.

## Закрытые критические дефекты

| Область | Исправление | Проверка |
|---|---|---|
| Account isolation | Полная очистка runtime при A→B, account-scoped storage, безопасная legacy migration, адресное удаление данных аккаунта | Независимый re-review: P0 не осталось |
| GPX/FIT rewards | Сервер самостоятельно проверяет полноту и монотонность timestamps; historical/manual import не получает XP | Unit 3/3 + Deno check |
| Active quest | Серверный выбор, cross-device restore, partial progress, подтверждение смены, конфликт вместо silent abandon | TypeScript + SQL parse + rollback transaction на live |
| Search pagination | Детерминированный `b.id`, request ownership, сброс состояния при account switch | TypeScript + upgrade-parity SQL |
| Garage recommendations | Реальные детали не зависят от игрового уровня; manufacturer-approved evidence используется; ссылки и даты доступны | Source audit |
| Garage configuration | Catalog selection гидратирует factory fitments и все 10 полей; ручные компоненты участвуют в default-deny solver; compatible/incompatible отображаются и сортируются по контексту поездки | TypeScript + regression contract |
| Bike save | Cloud row остаётся authoritative; при ошибке UI не покидает редактор и не подменяет локальный велосипед | Regression contract |
| Ride truth/privacy | Moving time исключает паузы и невозможные segment speeds; набор высоты сглажен; privacy zone маскирует и H3, и сохраняемую/отображаемую полилинию | 4 behavioral tests + Edge check |
| Route profiles | Road, gravel и MTB используют разные BRouter profiles; карта повторно fit-ится при смене bounds | All-Edge check + regression contract |
| Tablet layout | Основные экраны получили адаптивный max-width вместо растягивания на всю ширину планшета | TypeScript + clean bundles |
| Backend reproducibility | Core schema, config, deterministic baseline, hardening delta, CI replay workflow | Static backend audit + SQL parser |

## Проверки RC

| Gate | Результат |
|---|---|
| `npm run check:release` | PASS |
| TypeScript | PASS |
| Automated tests | 12/12 PASS: GPX, privacy, moving time, elevation, save, catalog verification, routes, backend contracts |
| Catalog integrity | 663 active / 43 brands PASS |
| Edge `ride-processor` check | PASS |
| PostgreSQL parser | 4/4 migrations PASS |
| Backend static audit | 25 RLS tables / 7 Edge Functions PASS |
| Expo Doctor | 20/20 PASS в изолированном audit cycle; повтор без git metadata дал только setup/proxy warnings, не code defect |
| iOS Expo export | PASS, 922 modules |
| Android Expo export | PASS, 887 modules |
| Route probes | Taganrog, Freiburg, Girona — 3/3 PASS |
| Live hardening smoke | Выполнено внутри `BEGIN … ROLLBACK`, без production mutation |

## Велопарк: фактическое наполнение

| Метрика | Факт | Покрытие |
|---|---:|---:|
| Активные модели | 663 | 100% manifest |
| Бренды | 43 | — |
| Модельные годы | 2020–2026 | — |
| Manufacturer URL | 663 | 100% |
| Категория в raw source | 593 | 89.44% |
| Категория после release normalization | 663 | 100% |
| Явный model-year evidence после release normalization | 663 | 100% |
| Drivetrain | 148 | 22.32% |
| Тормоза | 65 | 9.80% |
| Размер колёс | 69 | 10.41% |
| Remote photo | 12 | 1.81% |
| Все 10 Garage-полей | 6 | 0.90% |
| Exact fitment | 23 | 3.47% |
| Recommendation path | 5 | 0.75% |
| Компоненты | 41 | — |
| Compatibility rules | 16 | 14 compatible + 2 explicit incompatible |
| Factory/manufacturer fitments | 50 | 23 модели |

Вывод: это широкий alpha-каталог с доказательным наполнением для небольшого pilot subset. Он не соответствует максимальному критерию глубины и не должен называться полным велопарком.

## Критерии закрытия Garage

Перед заявлением «полное наполнение» должны быть приняты и достигнуты измеримые gates:

1. 100% моделей: identity, 2020+, canonical category, manufacturer URL и явное доказательство model year.
2. Integrity validator проверяет одинаково глубоко все 663 master rows, а не только batch Waves 14–16.
3. Priority tier: фото, 10 Garage-полей, exact fitment и объяснимый compatibility outcome.
4. Catalog-wide минимум: фото ≥80%, core specs ≥80%, exact fitment ≥60%, recommendation или evidence-backed no-upgrade outcome ≥60%.
5. Каждая рекомендация, совместимость и отказ показывают evidence URL, дату проверки и использованные ограничения.
6. Ноль guessed compatibility, broken references, duplicate identities, enabled pre-2020 моделей и нерешённых P0/P1 regression tests.

## Остаточные release gates

### Backend rollout

1. Выполнить clean `supabase db reset` в Docker/Supabase CLI и повторный reset для проверки идемпотентности.
2. Сделать backup и сравнить live schema с baseline.
3. Отметить `20260811000000` applied только после проверки; `db push --dry-run` должен показывать только `20260811190000_release_hardening`.
4. Применить hardening и задеплоить `ride-processor` и `route-generator`.
5. Повторить security/performance advisors и smoke tests.

### Device QA

- Apple Health и Health Connect permissions/import.
- MapLibre, геолокация, fog/H3 и deep links.
- Password recovery из реального email.
- Light/dark, iPhone/iPad, Android phone/tablet, native Back и accessibility.
- Визуальный screenshot-аудит реальных экранов; статическая проверка исходников его не заменяет.

### Product backlog

- Offline import queue и явный offline state.
- Retry/diagnostics при cloud hydration error.
- Отключённый Health source должен блокировать platform import.
- Сохранение/экспорт маршрута и связь маршрута с фактической поездкой.
- Multi-bike garage, archive/switch/delete и server-verified catalog relation.
- Нормализованный compatibility solver с conditional/incompatible outcomes.
- Evidence-first enrichment waves: новый `harvest.mjs media` извлекает кандидаты изображений только с allow-listed manufacturer pages; импорт по-прежнему требует HTTP/evidence validation.

## Release decision

- Source RC 0.8.2: **GO**.
- Production backend deploy: **HOLD до controlled rollout**.
- Device beta: **HOLD до physical-device matrix**.
- «Максимально наполненный велопарк»: **NO-GO до прохождения coverage gates**.

## Portable source checkpoint

- `VeloQuest-mobile-alpha-0.8.2-source-rc-final.zip`
- SHA-256 is recorded in the external release handoff after archive creation.
- ZIP integrity: PASS; `node_modules`, native generated folders, `.expo`, build output and `.env*` excluded.
