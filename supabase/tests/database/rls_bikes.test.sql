begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'rls-owner-a@veloquest.test'),
  ('22222222-2222-4222-8222-222222222222', 'rls-owner-b@veloquest.test');

insert into public.bikes (id, user_id, mode, name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'real', 'Owner A bike'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '22222222-2222-4222-8222-222222222222', 'real', 'Owner B bike');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select results_eq(
  $$select count(*)::bigint from public.bikes$$,
  $$values (1::bigint)$$,
  'authenticated user sees exactly their own bike'
);

select results_eq(
  $$select count(*)::bigint from public.bikes where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'$$,
  $$values (0::bigint)$$,
  'authenticated user cannot see another user bike'
);

select lives_ok(
  $$insert into public.bikes (user_id, mode, name) values ('11111111-1111-4111-8111-111111111111', 'veloquest', 'Owner A second bike')$$,
  'authenticated user can insert their own bike'
);

select throws_ok(
  $$insert into public.bikes (user_id, mode, name) values ('22222222-2222-4222-8222-222222222222', 'veloquest', 'Forbidden insert')$$,
  '42501',
  'new row violates row-level security policy for table "bikes"',
  'authenticated user cannot insert a bike for another user'
);

select results_eq(
  $$with changed as (update public.bikes set name = 'Forbidden update' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' returning 1) select count(*)::bigint from changed$$,
  $$values (0::bigint)$$,
  'authenticated user cannot update another user bike'
);

select results_eq(
  $$with changed as (update public.bikes set name = 'Allowed update' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' returning 1) select count(*)::bigint from changed$$,
  $$values (1::bigint)$$,
  'authenticated user can update their own bike'
);

select results_eq(
  $$with removed as (delete from public.bikes where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' returning 1) select count(*)::bigint from removed$$,
  $$values (0::bigint)$$,
  'authenticated user cannot delete another user bike'
);

select results_eq(
  $$with removed as (delete from public.bikes where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' returning 1) select count(*)::bigint from removed$$,
  $$values (1::bigint)$$,
  'authenticated user can delete their own bike'
);

select * from finish();
rollback;
