# VeloQuest 0.8.9 OAuth provider setup

Date: 2026-08-17  
Supabase project: `rvqiptyzsjcunzjhofid`

This runbook is the remaining provider-console step for real Google and VK OAuth E2E. Do not put provider credentials in Expo, React Native, `app.json`, source control, screenshots, or client logs.

Re-audited 2026-08-17 against current Supabase Google/mobile redirect documentation, Google OAuth redirect/audience documentation, and the current VKCOM VK ID SDK OAuth 2.1 contract/tests.

## Exact redirect boundaries

| Purpose | Exact URI | Configure in |
|---|---|---|
| Google OAuth provider callback | `https://rvqiptyzsjcunzjhofid.supabase.co/auth/v1/callback` | Google OAuth Web client |
| VeloQuest app callback/deep link | `veloquest://auth/callback` | Supabase Auth Redirect URLs |
| VK ID backend callback | `https://rvqiptyzsjcunzjhofid.supabase.co/functions/v1/vk-auth-callback` | VK ID application |

URIs must match byte-for-byte, including scheme, path, and absence of a trailing slash.

The mobile deep link is **not** a Google or VK provider callback. Google redirects to Supabase Auth. VK redirects to the VeloQuest Supabase Edge Function. Only after the provider/backend flow is validated does VeloQuest return to `veloquest://auth/callback`.

## Google through Supabase Auth

1. In Google Auth Platform / Cloud Console, create or select the VeloQuest alpha project and configure the audience/consent screen.
2. Create an OAuth 2.0 **Web application** client for the Supabase broker flow.
3. Add **only** the Google provider callback URI from the table as an Authorized redirect URI:

   ```text
   https://rvqiptyzsjcunzjhofid.supabase.co/auth/v1/callback
   ```

   Google requires an exact match; scheme, host, path and trailing slash are significant. `veloquest://auth/callback` does not belong in this Google field.
4. In Supabase Dashboard → Authentication → Providers → Google, enable Google and enter the Web client ID and client secret.
5. In Supabase Dashboard → Authentication → URL Configuration, add the mobile callback to the Redirect URLs allow list:

   ```text
   veloquest://auth/callback
   ```

6. Keep the requested Google scopes to authentication only unless a product requirement later proves another Google API is needed.
7. Do not enable unsafe automatic linking by an unverified email. VeloQuest uses an authenticated, explicit link action for an existing account.

### Google Testing-mode rule

If the Google application remains in **Testing** for the closed alpha:

- add every Google account used for provider QA to the Google Auth Platform test-user list;
- Google currently limits Testing to 100 listed test users;
- Google documents that authorizations by test users expire seven days after consent.

Therefore, if an alpha tester is still using a Testing-mode Google app after seven days, distinguish provider authorization expiry from a VeloQuest persisted-session defect before filing a session P0/P1.

### Google physical-device acceptance

1. New Google sign-in → success.
2. Browser cancel → no session mutation.
3. Provider denial/error → normalized error; no raw callback URI or provider token is surfaced.
4. Kill/restart → Supabase session persists within the provider's valid authorization lifetime.
5. Sign out → Google sign-in again → same VeloQuest account.
6. Existing email/VK account → explicit Google link → same VeloQuest user ID.
7. Switch account while a linking flow is outstanding → stale operation is rejected before `exchangeCodeForSession` mutates auth state.

The mobile flow uses Supabase OAuth with PKCE and exchanges a strictly validated callback code exactly once.

## VK ID backend bridge

VeloQuest does not exchange VK authorization material in the mobile client. The browser returns to the HTTPS Supabase Edge callback; the backend performs the VK exchange and returns only a one-time opaque app ticket to the custom mobile deep link.

1. Create a VK ID application in the official VK ID connection cabinet.
2. Register this exact provider redirect URI:

   ```text
   https://rvqiptyzsjcunzjhofid.supabase.co/functions/v1/vk-auth-callback
   ```

3. Record the public VK application/client ID.
4. Generate a new high-entropy bridge encryption key of at least 32 random bytes. Keep it backend-only.
5. Generate `RIDE_CONNECTOR_ATTESTATION_KEY` independently from the VK key. It authenticates trusted backend connector calls to `ride-processor`; it is not an OAuth credential.
6. Set backend secrets for the linked Supabase project only when the controlled deployment step is approved:

   ```sh
   supabase secrets set --project-ref rvqiptyzsjcunzjhofid \
     VK_CLIENT_ID='<vk-client-id>' \
     VK_BRIDGE_ENCRYPTION_KEY='<high-entropy-backend-secret>' \
     RIDE_CONNECTOR_ATTESTATION_KEY='<independent-high-entropy-backend-secret>'
   ```

7. Deploy `vk-auth-start`, `vk-auth-callback`, and `vk-auth-finish` from the verified release commit only.
8. Deploy `strava-sync` and `ride-processor` from the same verified commit so their connector-attestation contract matches.
9. Confirm all bridge functions use their committed custom-auth configuration; never replace the bridge with a client-only provider-token exchange.

### VK protocol contract verified against the current VK ID SDK

The current implementation matches the VKCOM SDK OAuth 2.1 flow:

- authorization endpoint: `https://id.vk.ru/authorize`;
- `client_id` and `app_id` use the VK application ID;
- `response_type=code`;
- PKCE uses SHA-256 and `code_challenge_method=s256`;
- random `state` is stored server-side only as a hash and can be claimed once;
- callback is accepted only with the original `state`, authorization `code`, and `device_id`;
- code exchange is POST `https://id.vk.ru/oauth2/auth` with `grant_type=authorization_code`, the same `redirect_uri`, `client_id`, server-held `code_verifier`, `state`, `device_id`, and the authorization `code` in the form body;
- profile lookup is POST `https://id.vk.ru/oauth2/user_info` with `client_id` and the received access token;
- the stable VK subject comes from the authenticated `user_info` response, not from an untrusted callback field.

The current bridge consumes a VK application ID plus PKCE and does not read a VK client secret. Do not invent an unused VK secret in mobile code or Supabase. If VK changes the application contract and explicitly requires another credential, treat that as a protocol change and re-audit the bridge before configuration.

### VK physical-device acceptance

1. New VK sign-in → success.
2. Browser cancel → no ticket consumption.
3. VK deny/error → safe normalized error.
4. Expired or already-claimed state → rejected.
5. Returned opaque ticket can be consumed exactly once.
6. Wrong app-held verifier / replayed ticket → rejected.
7. Kill/restart → resulting Supabase session persists.
8. Sign out → VK sign-in again resolves the same VeloQuest user.
9. Existing account → explicit VK link → same user ID.
10. Linking callback consumed from a different authenticated account → rejected.
11. Unlink VK with another valid sign-in method → success.
12. Attempt to remove the last valid sign-in method → rejected.

VK email is not used as an automatic account-linking key.

## Sign in with Apple readiness

Version 0.8.9 does not show an Apple button and does not claim Apple E2E. The account model keeps external identities separate from account email and supports explicit provider linking, so Apple can be added after the paid Apple Developer Program and provider credentials are available.

## Controlled deployment boundary

Provider applications existing does **not** authorize a production 0.8.9 rollout.

Before any production mutation:

1. exact-head release checks, clean DB replay/reset, RLS and achievement-concurrency gates are green;
2. required provider IDs and backend-only secrets exist in the target environment;
3. only the explicitly approved 0.8.9 migrations/functions are deployed under the controlled rollout procedure;
4. authenticated negative + positive smoke passes;
5. only then run real Google/VK physical-device E2E.

Never expose the Google client secret, service-role key, `VK_BRIDGE_ENCRYPTION_KEY`, or `RIDE_CONNECTOR_ATTESTATION_KEY` in `EXPO_PUBLIC_*` variables or the mobile repository.

## Current external blockers

Until the provider applications are created, these remain external prerequisites rather than code defects:

- Google Web OAuth client ID + client secret configured in Supabase;
- Google QA accounts added as test users while the app is in Testing;
- VK ID application/client ID with the exact Supabase Edge callback registered;
- backend-only `VK_BRIDGE_ENCRYPTION_KEY`;
- backend-only `RIDE_CONNECTOR_ATTESTATION_KEY`;
- physical-device provider E2E.
