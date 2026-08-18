import { parseOAuthCallback } from './oauthCallback.ts';
import { createAppTicketBinding } from '../../supabase/functions/_shared/vkOAuth.ts';
import type { ProviderAuthResult } from './googleAuth.ts';

const VK_APP_REDIRECT = 'veloquest://auth/callback';

type VkStartResult = {
  authorizationUrl?: string | null;
  error?: { code?: string | null } | null;
};

type VkBrowserResult = {
  type: string;
  url?: string;
};

type VkFinishResult =
  | { type: 'magiclink'; email: string; tokenHash: string; error?: null }
  | { linked: true; error?: null }
  | { error: { code?: string | null } };

type VkVerifyInput = {
  type: 'magiclink';
  email: string;
  tokenHash: string;
};

type VkOAuthDependencies = {
  createBinding?: () => Promise<{ verifier: string; challenge: string }>;
  start: (intent: 'sign_in' | 'link', appCodeChallenge: string) => Promise<VkStartResult>;
  open: (authorizationUrl: string, redirectUrl: string) => Promise<VkBrowserResult>;
  finish: (ticket: string, appCodeVerifier: string) => Promise<VkFinishResult>;
  verify: (input: VkVerifyInput) => Promise<{ error?: { code?: string | null } | null }>;
};

function safeCode(value: string | null | undefined, fallback: string) {
  return value && /^[a-z0-9_.-]{1,80}$/iu.test(value) ? value : fallback;
}

export async function runVkOAuth(
  dependencies: VkOAuthDependencies,
  intent: 'sign_in' | 'link',
): Promise<ProviderAuthResult> {
  const binding = await (dependencies.createBinding ?? createAppTicketBinding)();
  const started = await dependencies.start(intent, binding.challenge);
  if (started.error || !started.authorizationUrl) {
    return { kind: 'error', code: safeCode(started.error?.code, 'vk_start_failed') };
  }

  const browser = await dependencies.open(started.authorizationUrl, VK_APP_REDIRECT);
  if (browser.type === 'cancel' || browser.type === 'dismiss') return { kind: 'cancelled' };
  if (browser.type !== 'success' || !browser.url) {
    return { kind: 'error', code: 'vk_browser_failed' };
  }

  const callback = parseOAuthCallback(browser.url);
  if (callback.kind === 'cancelled') return { kind: 'cancelled' };
  if (callback.kind === 'provider-error') {
    return { kind: 'error', code: safeCode(callback.code, 'vk_provider_error') };
  }
  if (callback.kind !== 'success-vk-ticket') {
    return { kind: 'error', code: 'invalid_callback' };
  }

  const finished = await dependencies.finish(callback.ticket, binding.verifier);
  if ('error' in finished && finished.error) {
    return { kind: 'error', code: safeCode(finished.error.code, 'vk_finish_failed') };
  }

  if (intent === 'link') {
    return 'linked' in finished && finished.linked === true
      ? { kind: 'success' }
      : { kind: 'error', code: 'vk_link_failed' };
  }

  if (
    !('type' in finished)
    || finished.type !== 'magiclink'
    || typeof finished.email !== 'string'
    || typeof finished.tokenHash !== 'string'
  ) {
    return { kind: 'error', code: 'vk_session_failed' };
  }

  const verification = await dependencies.verify({
    type: 'magiclink',
    email: finished.email,
    tokenHash: finished.tokenHash,
  });
  return verification.error
    ? { kind: 'error', code: safeCode(verification.error.code, 'vk_session_failed') }
    : { kind: 'success' };
}

async function defaultDependencies(): Promise<VkOAuthDependencies> {
  const [{ supabase }, browser] = await Promise.all([
    import('../lib/supabase.ts'),
    import('expo-web-browser'),
  ]);

  return {
    createBinding: createAppTicketBinding,
    start: async (intent, appCodeChallenge) => {
      const { data, error } = await supabase.functions.invoke('vk-auth-start', {
        body: { intent, appCodeChallenge },
      });
      return {
        authorizationUrl: typeof data?.authorizationUrl === 'string' ? data.authorizationUrl : null,
        error: error ? { code: 'vk_start_failed' } : null,
      };
    },
    open: async (authorizationUrl, redirectUrl) => {
      const result = await browser.openAuthSessionAsync(authorizationUrl, redirectUrl);
      return result.type === 'success'
        ? { type: result.type, url: result.url }
        : { type: result.type };
    },
    finish: async (ticket, appCodeVerifier) => {
      const { data, error } = await supabase.functions.invoke('vk-auth-finish', {
        body: { ticket, appCodeVerifier },
      });
      if (error) return { error: { code: 'vk_finish_failed' } };
      if (data?.linked === true) return { linked: true };
      if (
        data?.type === 'magiclink'
        && typeof data.email === 'string'
        && typeof data.tokenHash === 'string'
      ) {
        return {
          type: 'magiclink',
          email: data.email,
          tokenHash: data.tokenHash,
        };
      }
      return { error: { code: 'vk_finish_failed' } };
    },
    verify: async ({ email, tokenHash }) => {
      const { error } = await supabase.auth.verifyOtp({
        type: 'magiclink',
        email,
        token_hash: tokenHash,
      });
      return { error: error ? { code: error.code } : null };
    },
  };
}

export async function signInWithVk(): Promise<ProviderAuthResult> {
  return runVkOAuth(await defaultDependencies(), 'sign_in');
}

export async function linkVkIdentity(): Promise<ProviderAuthResult> {
  return runVkOAuth(await defaultDependencies(), 'link');
}


export async function loadVkIdentityStatus(): Promise<{ linked: boolean; canUnlink: boolean }> {
  const { supabase } = await import('../lib/supabase.ts');
  const { data, error } = await supabase.rpc('list_external_identities');
  if (error) throw error;
  const row = Array.isArray(data) ? data.find((item) => item?.provider === 'vk') : null;
  return {
    linked: row?.linked === true,
    canUnlink: row?.can_unlink === true,
  };
}

export async function unlinkVkIdentity(): Promise<boolean> {
  const { supabase } = await import('../lib/supabase.ts');
  const { data, error } = await supabase.rpc('unlink_vk_identity');
  if (error) throw error;
  return data === true;
}
