# VeloQuest 0.8.8 device candidate

Date: 2026-08-14

- App version 0.8.8; iOS build 8; Android versionCode 8.
- Fresh native iOS project generated from the current source with Expo prebuild.
- Bundle identifier: `com.semyonsemenyuk.veloquest`.
- iPhone and iPad enabled; HealthKit entitlement and privacy strings present.
- Production publishable Supabase endpoint is configured.
- TypeScript PASS; Node suite 37/37 PASS after route-consent contract; migration/SQL/backend audits PASS.
- macOS helper: `scripts/prepare-ios-on-mac.sh` installs JS dependencies and CocoaPods, regenerates native iOS files and opens the workspace.

This Linux environment cannot perform Apple code signing or physical-device execution. Xcode/Personal Team signing and the physical E2E matrix remain device-side verification steps. Production Route Engine for personal coordinates remains held until the project owner explicitly authorizes disclosure to public BRouter/Overpass or selects a trusted/self-hosted router.
