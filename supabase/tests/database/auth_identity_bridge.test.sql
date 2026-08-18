begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(17);

select has_table('private', 'oauth_transactions', 'VK OAuth transactions are private');
select has_table('private', 'external_identities', 'external identity bindings are private');
select has_function('private', 'consume_vk_ticket', array['text', 'text'], 'ticket consumption is server-only');

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'private.oauth_transactions'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%(state_hash)%'
  ),
  'state hashes are unique'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'private.external_identities'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%(provider, provider_subject)%'
  ),
  'provider subjects bind once'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'private.external_identities'::regclass
      and contype = 'f'
      and confdeltype = 'c'
  ),
  'identity bindings cascade when their auth user is deleted'
);

set local role anon;
select throws_ok(
  $$select * from private.oauth_transactions$$,
  '42501',
  'permission denied for schema private',
  'anon cannot read OAuth transactions'
);
reset role;

set local role authenticated;
select throws_ok(
  $$insert into private.external_identities (provider, provider_subject, user_id) values ('vk', 'forged', gen_random_uuid())$$,
  '42501',
  'permission denied for schema private',
  'authenticated users cannot forge identity bindings'
);
select throws_ok(
  $$select * from private.consume_vk_ticket('forged', 'wrong-challenge')$$,
  '42501',
  'permission denied for schema private',
  'authenticated users cannot consume bridge tickets directly'
);
select throws_ok(
  $$select public.consume_vk_ticket_service('forged', 'wrong-challenge')$$,
  '42501',
  'permission denied for function consume_vk_ticket_service',
  'authenticated users cannot execute the service ticket RPC'
);
reset role;

insert into auth.users (id, email)
values ('33333333-3333-4333-8333-333333333333', 'vk-bridge@veloquest.test');

insert into private.oauth_transactions (
  state_hash,
  pkce_verifier_ciphertext,
  intent,
  user_id,
  nonce_hash,
  expires_at,
  callback_completed_at,
  ticket_hash,
  provider_subject,
  verification_material_ciphertext
)
values (
  'state-fixture',
  'encrypted-verifier',
  'sign_in',
  '33333333-3333-4333-8333-333333333333',
  'nonce-fixture',
  now() + interval '5 minutes',
  now(),
  'ticket-fixture',
  'vk-subject-fixture',
  'encrypted-verification'
);

select results_eq(
  $$select user_id from private.consume_vk_ticket('ticket-fixture', 'nonce-fixture')$$,
  $$values ('33333333-3333-4333-8333-333333333333'::uuid)$$,
  'the first server-side ticket consume succeeds'
);

select results_eq(
  $$select count(*)::bigint from private.consume_vk_ticket('ticket-fixture', 'nonce-fixture')$$,
  $$values (0::bigint)$$,
  'a replayed ticket cannot be consumed twice'
);


insert into auth.users (id, email)
values
  ('66666666-6666-4666-8666-666666666666', 'linked-user@veloquest.test'),
  ('88888888-8888-4888-8888-888888888888', 'vk-synthetic@auth.veloquest.invalid');

insert into private.external_identities (provider, provider_subject, user_id, auth_email)
values
  ('vk', 'vk-linked-user', '66666666-6666-4666-8666-666666666666', 'linked-user@veloquest.test'),
  ('vk', 'vk-only-user', '88888888-8888-4888-8888-888888888888', 'vk-synthetic@auth.veloquest.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
select results_eq(
  $q$select linked from public.list_external_identities() where provider = 'vk'$q$,
  $q$values (true)$q$,
  'linked identity status is server-backed'
);
select lives_ok(
  $q$select public.unlink_vk_identity()$q$,
  'VK can be unlinked when another recoverable sign-in method exists'
);
select results_eq(
  $q$select linked from public.list_external_identities() where provider = 'vk'$q$,
  $q$values (false)$q$,
  'unlink removes the authoritative VK binding'
);

select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', true);
select throws_ok(
  $q$select public.unlink_vk_identity()$q$,
  '55000',
  'cannot_unlink_last_sign_in_method',
  'the last usable sign-in method cannot be removed'
);
reset role;
select results_eq(
  $q$select count(*)::bigint from private.external_identities where user_id = '88888888-8888-4888-8888-888888888888'$q$,
  $q$values (1::bigint)$q$,
  'blocked unlink preserves the VK binding'
);

select * from finish();
rollback;
