create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.oauth_transactions (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'vk' check (provider in ('vk', 'google', 'apple')),
  intent text not null check (intent in ('sign_in', 'link')),
  user_id uuid references auth.users(id) on delete cascade,
  state_hash text not null unique,
  nonce_hash text not null unique,
  pkce_verifier_ciphertext text not null,
  expires_at timestamptz not null,
  callback_claimed_at timestamptz,
  callback_completed_at timestamptz,
  ticket_hash text unique,
  provider_subject text,
  verification_material_ciphertext text,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint oauth_transactions_link_user_required
    check (intent <> 'link' or user_id is not null),
  constraint oauth_transactions_valid_expiry
    check (expires_at > created_at),
  constraint oauth_transactions_callback_is_complete
    check (
      (
        callback_completed_at is null
        and ticket_hash is null
        and provider_subject is null
        and verification_material_ciphertext is null
      )
      or
      (
        callback_completed_at is not null
        and ticket_hash is not null
        and provider_subject is not null
        and verification_material_ciphertext is not null
      )
    ),
  constraint oauth_transactions_consumed_after_callback
    check (consumed_at is null or callback_completed_at is not null)
);

create index if not exists oauth_transactions_expires_at_idx
  on private.oauth_transactions (expires_at)
  where consumed_at is null;

create table if not exists private.external_identities (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'vk' check (provider in ('vk', 'google', 'apple')),
  provider_subject text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_email text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (provider, provider_subject),
  unique (provider, user_id),
  unique (auth_email)
);

alter table private.oauth_transactions enable row level security;
alter table private.external_identities enable row level security;

revoke all on table private.oauth_transactions from public, anon, authenticated;
revoke all on table private.external_identities from public, anon, authenticated;
grant select, insert, update, delete on table private.oauth_transactions to service_role;
grant select, insert, update, delete on table private.external_identities to service_role;

create or replace function private.consume_vk_ticket(p_ticket_hash text, p_app_challenge text)
returns table (
  user_id uuid,
  intent text,
  provider_subject text,
  verification_material_ciphertext text
)
language sql
security definer
set search_path = ''
as $$
  update private.oauth_transactions as oauth_tx
  set consumed_at = now()
  where oauth_tx.ticket_hash = p_ticket_hash
    and oauth_tx.nonce_hash = p_app_challenge
    and oauth_tx.callback_completed_at is not null
    and oauth_tx.consumed_at is null
    and oauth_tx.expires_at > now()
  returning
    oauth_tx.user_id,
    oauth_tx.intent,
    oauth_tx.provider_subject,
    oauth_tx.verification_material_ciphertext;
$$;

revoke all on function private.consume_vk_ticket(text, text) from public, anon, authenticated;
grant execute on function private.consume_vk_ticket(text, text) to service_role;

create or replace function public.start_vk_oauth_transaction(
  p_state_hash text,
  p_nonce_hash text,
  p_pkce_verifier_ciphertext text,
  p_intent text,
  p_user_id uuid,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  transaction_id uuid;
begin
  insert into private.oauth_transactions (
    state_hash,
    nonce_hash,
    pkce_verifier_ciphertext,
    intent,
    user_id,
    expires_at
  )
  values (
    p_state_hash,
    p_nonce_hash,
    p_pkce_verifier_ciphertext,
    p_intent,
    p_user_id,
    p_expires_at
  )
  returning id into transaction_id;
  return transaction_id;
end;
$$;

create or replace function public.claim_vk_oauth_state(p_state_hash text)
returns table (
  transaction_id uuid,
  pkce_verifier_ciphertext text,
  intent text,
  linking_user_id uuid,
  nonce_hash text
)
language sql
security definer
set search_path = ''
as $$
  update private.oauth_transactions as oauth_tx
  set callback_claimed_at = now()
  where oauth_tx.state_hash = p_state_hash
    and oauth_tx.callback_claimed_at is null
    and oauth_tx.callback_completed_at is null
    and oauth_tx.consumed_at is null
    and oauth_tx.expires_at > now()
  returning
    oauth_tx.id,
    oauth_tx.pkce_verifier_ciphertext,
    oauth_tx.intent,
    oauth_tx.user_id,
    oauth_tx.nonce_hash;
$$;

create or replace function public.complete_vk_oauth_transaction(
  p_transaction_id uuid,
  p_ticket_hash text,
  p_provider_subject text,
  p_verification_material_ciphertext text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with completed as (
    update private.oauth_transactions as oauth_tx
    set
      callback_completed_at = now(),
      ticket_hash = p_ticket_hash,
      provider_subject = p_provider_subject,
      verification_material_ciphertext = p_verification_material_ciphertext
    where oauth_tx.id = p_transaction_id
      and oauth_tx.callback_claimed_at is not null
      and oauth_tx.callback_completed_at is null
      and oauth_tx.consumed_at is null
      and oauth_tx.expires_at > now()
    returning 1
  )
  select exists(select 1 from completed);
$$;

create or replace function public.resolve_vk_identity(p_provider_subject text)
returns table (user_id uuid, auth_email text)
language sql
security definer
stable
set search_path = ''
as $$
  select identity.user_id, identity.auth_email
  from private.external_identities as identity
  where identity.provider = 'vk'
    and identity.provider_subject = p_provider_subject;
$$;

create or replace function public.bind_vk_identity(
  p_provider_subject text,
  p_user_id uuid,
  p_auth_email text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.external_identities (
    provider,
    provider_subject,
    user_id,
    auth_email
  )
  values ('vk', p_provider_subject, p_user_id, p_auth_email)
  on conflict (provider, provider_subject) do update
  set last_seen_at = now()
  where private.external_identities.user_id = excluded.user_id;

  return found;
exception
  when unique_violation then
    return false;
end;
$$;

create or replace function public.list_external_identities()
returns table (provider text, linked boolean, can_unlink boolean)
language sql
security definer
stable
set search_path = ''
as $identity$
  with current_user_record as (
    select auth_user.id, auth_user.email
    from auth.users as auth_user
    where auth_user.id = auth.uid()
  )
  select
    'vk'::text as provider,
    exists (
      select 1
      from private.external_identities as identity
      where identity.provider = 'vk'
        and identity.user_id = auth.uid()
    ) as linked,
    exists (
      select 1
      from private.external_identities as identity
      where identity.provider = 'vk'
        and identity.user_id = auth.uid()
    )
    and exists (
      select 1
      from current_user_record as account
      where account.email not like 'vk-%@auth.veloquest.invalid'
        or exists (
          select 1
          from auth.identities as identity
          where identity.user_id = account.id
            and identity.provider in ('google', 'apple')
        )
    ) as can_unlink;
$identity$;

create or replace function public.unlink_vk_identity()
returns boolean
language plpgsql
security definer
set search_path = ''
as $identity$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_has_other_method boolean;
begin
  if v_user_id is null then
    raise insufficient_privilege using message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from private.external_identities as identity
    where identity.provider = 'vk'
      and identity.user_id = v_user_id
  ) then
    return false;
  end if;

  select auth_user.email
  into v_email
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  v_has_other_method :=
    v_email is not null
    and (
      v_email not like 'vk-%@auth.veloquest.invalid'
      or exists (
        select 1
        from auth.identities as identity
        where identity.user_id = v_user_id
          and identity.provider in ('google', 'apple')
      )
    );

  if not v_has_other_method then
    raise exception using
      errcode = '55000',
      message = 'cannot_unlink_last_sign_in_method';
  end if;

  delete from private.external_identities as identity
  where identity.provider = 'vk'
    and identity.user_id = v_user_id;
  return found;
end;
$identity$;

create or replace function public.consume_vk_ticket_service(p_ticket_hash text, p_app_challenge text)
returns table (
  user_id uuid,
  intent text,
  provider_subject text,
  verification_material_ciphertext text
)
language sql
security definer
set search_path = ''
as $$
  select consumed.user_id, consumed.intent, consumed.provider_subject, consumed.verification_material_ciphertext
  from private.consume_vk_ticket(p_ticket_hash, p_app_challenge) as consumed;
$$;

revoke all on function public.start_vk_oauth_transaction(text, text, text, text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_vk_oauth_state(text) from public, anon, authenticated;
revoke all on function public.complete_vk_oauth_transaction(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.resolve_vk_identity(text) from public, anon, authenticated;
revoke all on function public.bind_vk_identity(text, uuid, text) from public, anon, authenticated;
revoke all on function public.list_external_identities() from public, anon;
revoke all on function public.unlink_vk_identity() from public, anon;
grant execute on function public.list_external_identities() to authenticated;
grant execute on function public.unlink_vk_identity() to authenticated;
revoke all on function public.consume_vk_ticket_service(text, text) from public, anon, authenticated;

grant execute on function public.start_vk_oauth_transaction(text, text, text, text, uuid, timestamptz) to service_role;
grant execute on function public.claim_vk_oauth_state(text) to service_role;
grant execute on function public.complete_vk_oauth_transaction(uuid, text, text, text) to service_role;
grant execute on function public.resolve_vk_identity(text) to service_role;
grant execute on function public.bind_vk_identity(text, uuid, text) to service_role;
grant execute on function public.consume_vk_ticket_service(text, text) to service_role;
