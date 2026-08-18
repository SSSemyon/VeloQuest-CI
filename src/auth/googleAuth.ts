import { parseOAuthCallback } from './oauthCallback.ts';

export const GOOGLE_REDIRECT = 'veloquest://auth/callback';

export type ProviderAuthResult =
  | { kind: 'success' }
  | { kind: 'cancelled' }
  | { kind: 'error'; code: string };

type BeginResult = {
  url?: string | null;
  error?: { code?: string | null } | null;
};

type BrowserResult = {
  type: string;
  url?: string;
};

type ExchangeResult = {
  error?: { code?: string | null } | null;
};

export type GoogleOAuthDependencies = {
  begin: () => Promise<BeginResult>;
  open: (authorizationUrl: string, redirectUrl: string) => Promise<BrowserResult>;
  exchange: (code: string) => Promise<ExchangeResult>;
  isCurrent?: () => boolean;
};

function safeErrorCode(value: string | null | undefined, fallback: string) {
  if (!value || !/^[a-z0-9_.-]{1,80}$/i.test(value)) return fallback;
  return value;
}

export async function runGoogleOAuth(
  dependencies: GoogleOAuthDependencies,
): Promise<ProviderAuthResult> {
  const started = await dependencies.begin();
  if (started.error || !started.url) {
    return {
      kind: 'error',
      code: safeErrorCode(started.error?.code, 'oauth_start_failed'),
    };
  }

  const browser = await dependencies.open(started.url, GOOGLE_REDIRECT);
  if (browser.type === 'cancel' || browser.type === 'dismiss') {
    return { kind: 'cancelled' };
  }
  if (browser.type !== 'success' || !browser.url) {
    return { kind: 'error', code: 'oauth_browser_failed' };
  }

  const callback = parseOAuthCallback(browser.url);
  if (callback.kind === 'cancelled') return { kind: 'cancelled' };
  if (callback.kind === 'provider-error') {
    return {
      kind: 'error',
      code: safeErrorCode(callback.code, 'provider_error'),
    };
  }
  if (callback.kind !== 'success-code') {
    return { kind: 'error', code: 'invalid_callback' };
  }

  // Session exchange itself mutates persisted auth state, so reject stale
  // account operations before crossing that boundary.
  if (dependencies.isCurrent && !dependencies.isCurrent()) {
    return { kind: 'error', code: 'stale_account_operation' };
  }
  const exchanged = await dependencies.exchange(callback.code);
  if (exchanged.error) {
    return {
      kind: 'error',
      code: safeErrorCode(exchanged.error.code, 'code_exchange_failed'),
    };
  }

  return { kind: 'success' };
}

async function defaultDependencies(intent: 'sign-in' | 'link', isCurrent?: () => boolean): Promise<GoogleOAuthDependencies> {
  const [{ supabase }, browser] = await Promise.all([
    import('../lib/supabase.ts'),
    import('expo-web-browser'),
  ]);

  return {
    isCurrent,
    begin: async () => {
      const options = {
        redirectTo: GOOGLE_REDIRECT,
        skipBrowserRedirect: true,
      };
      const response = intent === 'link'
        ? await supabase.auth.linkIdentity({ provider: 'google', options })
        : await supabase.auth.signInWithOAuth({ provider: 'google', options });

      return {
        url: response.data?.url,
        error: response.error ? { code: response.error.code } : null,
      };
    },
    open: async (authorizationUrl, redirectUrl) => {
      const result = await browser.openAuthSessionAsync(authorizationUrl, redirectUrl);
      return result.type === 'success'
        ? { type: result.type, url: result.url }
        : { type: result.type };
    },
    exchange: async (code) => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return {
        error: error ? { code: error.code } : null,
      };
    },
  };
}

export async function signInWithGoogle(): Promise<ProviderAuthResult> {
  return runGoogleOAuth(await defaultDependencies('sign-in'));
}

export async function linkGoogleIdentity(isCurrent?: () => boolean): Promise<ProviderAuthResult> {
  return runGoogleOAuth(await defaultDependencies('link', isCurrent));
}
