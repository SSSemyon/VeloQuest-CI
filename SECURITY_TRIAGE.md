# VeloQuest 0.8.x security triage

Triage updated: 2026-08-17.

## Decision

- Do not run `npm audit fix --force`. It proposes an Expo/React Native dependency change outside the SDK 57 compatibility contract.
- Override `uuid` only inside the transitive `xcode` build dependency to `11.1.1` or later within major 11.
- Accept the current `image-size` advisory temporarily as a build-time-only risk with strict input controls.
- Treat Supabase Security Advisor findings as inputs to review, not automatic vulnerabilities: inspect reachability and authorization semantics before changing an API boundary.
- Re-run this triage when Expo/Metro publishes a compatible dependency update, before controlled 0.8.9 production rollout, and before any public store release.

## Dependency reachability

### `image-size` through Metro

- Advisory: crafted ICNS/JXL/HEIF input can make the parser loop indefinitely.
- Dependency path: `expo/react-native -> metro@0.84.4 -> image-size@1.2.1`.
- Reachability in VeloQuest: Metro calls `image-size` while bundling local image assets. It is not shipped as a callable parser in the mobile application and is not used for GPX/FIT/user media input.
- Current input boundary: only reviewed repository assets are passed to Metro. Testers cannot upload image files into the build pipeline.
- Residual risk: a malicious or corrupted repository asset could stall CI/local bundling. Impact is build availability, not mobile account/data confidentiality or integrity.
- Temporary control: do not add untrusted ICNS/JXL/HEIF assets; review all new binary assets; keep builds time-bounded.
- Remediation owner: Expo/Metro. Metro currently declares `image-size ^1.0.2`; forcing a new major may break its callable CommonJS API.

### `uuid` through `xcode`

- Advisory affects UUID v3/v5/v6 calls when a caller supplies an undersized buffer.
- Dependency path: `@expo/config-plugins -> xcode@3.0.1 -> uuid@7.0.3`.
- Observed VeloQuest path: `xcode` calls `uuid.v4()` without a supplied buffer while generating the native iOS project, so the vulnerable operation is not reached.
- Defense in depth: package override pins the nested dependency to patched CommonJS-compatible `uuid@11.1.1`; native prebuild is a required regression gate.

## Supabase Security Advisor review · 2026-08-17

### `private.route_generation_rate_limits` has RLS enabled without policies

Intentional. The table is private server state, not a client data surface. `public`, `anon` and `authenticated` have no table privileges. The only supported mutation path is the reviewed quota RPC.

### `public.activate_quest_alpha(text, boolean)` is `SECURITY DEFINER`

Intentional authenticated API. It derives the actor only from `auth.uid()`, accepts no user ID, uses an empty `search_path`, selects only enabled quest templates and mutates only the caller's active quest run. The mobile client needs this RPC to keep quest selection server-authoritative across restarts/devices. Keep direct table write privileges closed and retain regression coverage.

### `public.consume_route_generation_quota(integer, integer)` is `SECURITY DEFINER`

The Advisor warning exposed an actionable parameter issue: the previous implementation accepted caller-selected limits in the broad ranges `1..30` and `10..3600`, allowing a malicious authenticated caller to weaken the intended six-per-minute window before invoking Route Engine.

Forward hardening `route_quota_parameter_hardening.sql` keeps the existing user-scoped `auth.uid()` boundary but accepts only the exact server contract `p_limit = 6` and `p_window_seconds = 60`; any other values raise `invalid_rate_limit`. A direct mobile RPC can therefore only consume the same quota it would consume through Route Engine and cannot increase or reset capacity early. The private rate table remains inaccessible directly.

### Leaked-password protection disabled

This is a production Auth configuration gap, not a code defect. Enable leaked-password protection during the controlled 0.8.9 Auth rollout, then verify normal email sign-up/sign-in/recovery and provider OAuth. Do not change the live Auth policy mid-RC without recording the rollout and smoke result.

## Release rule

This triage is acceptable for closed alpha only when all of the following remain true:

- Expo Doctor, TypeScript, Android/iOS native generation and release checks pass after a clean install;
- build inputs remain repository-controlled;
- the application does not expose Metro or `image-size` as a server/runtime service;
- no runtime-reachable critical/high issue affecting Auth, Supabase data access, ride processing, account isolation or arbitrary code execution remains open;
- Route Engine quota hardening has passed exact-head migration/reset/RLS tests before deployment;
- leaked-password protection is enabled and smoke-tested before closed-alpha expansion;
- the dependency audit exception is reviewed again before public store release.

Any runtime-reachable critical/high issue affecting Auth, Supabase data access, ride processing, account isolation or arbitrary code execution is a release blocker.
