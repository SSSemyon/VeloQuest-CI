# VeloQuest mobile alpha 0.8.9 Auth & Achievements Device Candidate RC

Expo / React Native alpha for the VeloQuest cycling exploration app.

## Implemented in this checkpoint

- Google OAuth through Supabase PKCE and a replay-safe backend VK ID bridge; Apple-ready identity schema without inactive Apple UI
- server-authoritative versioned achievements, immutable unlocks and exactly-once XP/cosmetic rewards
- free self-hosted macOS quality and clean unsigned `iphoneos` Release verification for the exact 0.8.9 code commit
- production UI pass for Auth, onboarding, ride source, quest selection, pre-ride and result states
- premium light visual system across Home, Map, Quests, Real Bike Garage, Profile, Ride History and Bike Edit
- optimized alpine cycling onboarding artwork plus the existing real-bike Garage artwork
- complete mobile shell: Home, World Map, Quests, Real Bike Garage, Profile
- ride history and local real-bike profile editor with drivetrain, wheelset and tires
- lightweight photorealistic Garage bike artwork (neutral/unbranded until the real catalogue exists)
- MapLibre Native + OpenFreeMap base map; route/H3 overlays no longer depend on Google Maps billing
- Route Engine v0.3 portability Alpha: authenticated GPS-based 5–25 km urban and 25–50 km regional route generation, dynamic OSM POI discovery, Road/Gravel/MTB selector, H3 novelty, route confidence, geometry diversity and MapLibre planned-route preview
- regional route ranking with three distinct alternatives: easier, more interesting and adventurous
- persistent Light/Dark runtime theme and vertical iPhone/iPad/Android tablet support
- first-run onboarding with source and Real Bike / VeloQuest Bike selection
- Apple HealthKit cycling workout + route import (read-only)
- Android Health Connect cycling session + route import (read-only)
- manual GPX import
- manual FIT import using the official Garmin FIT JavaScript SDK
- server-hydrated level and season XP, with a four-chapter static Alpha campaign
- explicit specialization choice (Explorer / Climber / Stayer) after level 3, one change per season, with specialization-weighted quest ordering
- persistent H3 territory after cold start plus a discrete fog-of-war frontier
- privacy zone enabled by default; start/end cells inside the configured radius are removed server-side before territory is persisted
- Real Bike / VeloQuest Bike mode selection; virtual bike cosmetics are clearly separated from real components
- server-guarded virtual item unlocks/installations by level
- Ride Inbox for transparent cross-source duplicate review while double-XP remains server-blocked
- Alpha telemetry contour for sync/errors, quest selection, route-influence feedback and render-error capture
- per-source sync diagnostics and explicit source disconnect controls
- authenticated account deletion with cloud-data cascade and device-cache cleanup
- evidence-backed Real Bike Garage catalogue with default-deny compatibility; initial verified Shimano DEORE M6100 and SRAM GX Eagle pairs
- Catalog Harvester checkpoint: 718 evidence-backed 2020–2026 models across 44 represented brands, including 55 current/retained Hagen model-year identities, 45 verified components, 20 compatibility rules and 61 exact bike/component fitments
- Strava OAuth, refresh-token, latest-ride, 30-day backfill and webhook backend contours; tokens never enter the mobile client
- canonical ride normalization, H3 exploration cells and deduplication before XP
- quest → ride → territory → XP → next quest loop
- local progress persistence
- Supabase email/password Auth with persisted mobile sessions
- automatic one-time migration of 0.3.0 bike, ride history and H3 territory; client-provided legacy XP is never trusted or minted
- cloud hydration for authoritative XP, H3 territory and active bike
- cloud hydration for ride history across signed-in devices
- server-side migration gate; historical territory grants no new quest XP
- authenticated server-side Ride Processor for every newly imported ride
- server-side route metric recalculation and H3 resolution 8 territory derivation
- source-level and cross-source ride deduplication before any quest/XP mutation
- atomic `Ride → H3 → Quest progress → XP ledger → Player Progress` transaction
- four production quest templates aligned with the mobile UI
- 36-hour reward window: older imports can restore territory but cannot farm quest XP

The `1380 XP` display baseline from 0.3.0 was demo state, not earned progression. Legacy migration does **not** mint XP from device state; authoritative progression starts from server-verified ride processing.

## Run checks

```bash
npm install
npm run typecheck
npm run probe:routes
npm run probe:routes:regional
npm run check:catalog
npm run prebuild
```

## Distribution

`eas.json` contains two relevant release profiles:

```bash
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

The Android preview profile outputs an APK. The iOS preview profile is the internal/ad hoc device build path; the production profile is the App Store/TestFlight path. EAS authentication and signing credentials are intentionally not stored in this project. Direct on-device iOS development can stay on Apple's Personal Team path while the app is in private alpha; follow `XCODE_DEVICE_INSTALL.md`.

The map uses `https://tiles.openfreemap.org/styles/liberty` through MapLibre Native and does not require a Google Maps API key. Before tester distribution, run smoke tests on a real iPhone and Android device.

## Backend configuration

The production Supabase URL and publishable key can be supplied with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The checked-in fallback is publishable client configuration only; no service-role credential is included in the app.

`supabase/functions/migrate-local-alpha` contains the authenticated one-time legacy migration endpoint. `supabase/functions/ride-processor` is the JWT-protected endpoint for new rides. `route-generator` is the JWT + user-session protected planned-route endpoint; BRouter is isolated behind `VQ_ROUTER_BASE_URL`, while Overpass POI discovery is isolated behind `VQ_POI_BASE_URL` with a public-instance failover and short-lived in-memory cache. These Alpha providers are not XP/H3 trust sources. `delete-account`, `strava-oauth`, `strava-sync` and `strava-webhook` contain the privacy and connector endpoints. The SQL files under `supabase/schema/` mirror the live backend DDL for reproducibility.

The mobile client no longer awards XP or decides whether a ride completed a quest. It imports the route, sends it to `ride-processor`, and treats the server result as authoritative. AsyncStorage is now only a device cache plus the 0.3.0 migration source.

## External/runtime gates still required

- configure free Google/VK provider applications and backend-only bridge/connector secrets; live OAuth is not claimed before physical-device E2E
- live Strava authorization still requires a registered Strava API application and backend secrets
- direct Garmin/Wahoo cloud connectors remain conditional on third-party API approval; FIT is the working vendor-neutral fallback
- on-device Auth → onboarding → ride import → achievement/XP → restart smoke on physical iOS and Android hardware
- strict screenshot-to-target Design QA on iPhone, iPad portrait, Android phone and Android tablet portrait
- App Store / Play Store production listing; personal iOS QA remains available through free Xcode Personal Team

Automated credential-independent preflight is GREEN at commit `dc9b8ce9929d15dddf868958e60783a11c0c0245`. Production remains unchanged.
