begin;
create temp table vq_release_smoke(name text primary key, passed boolean not null, detail text);
grant insert, select on vq_release_smoke to authenticated;

insert into auth.users(id,email,aud,role,is_sso_user,is_anonymous,created_at,updated_at)
values
('11111111-1111-4111-8111-111111111111','owner-a@veloquest.invalid','authenticated','authenticated',false,false,now(),now()),
('22222222-2222-4222-8222-222222222222','owner-b@veloquest.invalid','authenticated','authenticated',false,false,now(),now());

insert into public.bikes(id,user_id,mode,name) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','11111111-1111-4111-8111-111111111111','real','Owner A bike'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','22222222-2222-4222-8222-222222222222','real','Owner B bike');

create function public.vq_release_cross_insert_smoke()
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  insert into public.bikes(user_id,mode,name)
  values ('22222222-2222-4222-8222-222222222222','veloquest','Forbidden');
  return false;
exception when insufficient_privilege then return true;
end $$;
grant execute on function public.vq_release_cross_insert_smoke() to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into vq_release_smoke values
('rls_select_isolation',(select count(*)=1 from public.bikes),'A sees A only'),
('rls_cross_insert_blocked',public.vq_release_cross_insert_smoke(),'A cannot insert B bike');
with changed as (
 update public.bikes set name='blocked'
 where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' returning 1
) insert into vq_release_smoke select 'rls_cross_update_hidden',count(*)=0,'A cannot update B' from changed;
with removed as (
 delete from public.bikes where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' returning 1
) insert into vq_release_smoke select 'rls_cross_delete_hidden',count(*)=0,'A cannot delete B' from removed;
insert into vq_release_smoke
select 'quest_activation',code='new_land','server quest activation'
from public.activate_quest_alpha('new_land',false);
insert into vq_release_smoke values
('route_quota_first',public.consume_route_generation_quota(2,60),'first allowed');
insert into vq_release_smoke values
('route_quota_second',public.consume_route_generation_quota(2,60),'second allowed');
insert into vq_release_smoke values
('route_quota_denied',not public.consume_route_generation_quota(2,60),'third denied');
reset role;

do $smoke$
declare r1 jsonb; r2 jsonb; r3 jsonb;
begin
 r1:=public.process_ride_alpha(
 '11111111-1111-4111-8111-111111111111','gpx_fit','manual-1','source-manual-1','cross-1',
 now()-interval '3 days',now()-interval '3 days'+interval '1 hour',3600,20000,100,5.5,
 '{"type":"LineString","coordinates":[[0,0],[0.1,0.1]]}'::jsonb,array['881']::text[],'new_land',0,false);
 insert into vq_release_smoke values
 ('historical_zero_xp',coalesce((r1->>'xpAwarded')::int,-1)=0 and coalesce((r1->'quest'->>'rewardEligible')::boolean,true)=false,'manual historical-only');
 r2:=public.process_ride_alpha(
 '11111111-1111-4111-8111-111111111111','gpx_fit','manual-1-dup','source-manual-1','cross-1',
 now()-interval '3 days',now()-interval '3 days'+interval '1 hour',3600,20000,100,5.5,
 '{"type":"LineString","coordinates":[[0,0],[0.1,0.1]]}'::jsonb,array['881']::text[],'new_land',0,true);
 insert into vq_release_smoke values
 ('same_source_duplicate_zero_xp',coalesce((r2->>'duplicate')::boolean,false) and coalesce((r2->>'xpAwarded')::int,-1)=0,'same-source protected');
 r3:=public.process_ride_alpha(
 '11111111-1111-4111-8111-111111111111','strava','strava-dup','source-strava-dup','cross-1',
 now()-interval '3 days',now()-interval '3 days'+interval '1 hour',3600,20000,100,5.5,
 '{"type":"LineString","coordinates":[[0,0],[0.1,0.1]]}'::jsonb,array['881']::text[],'new_land',0,true);
 insert into vq_release_smoke values
 ('cross_source_duplicate_zero_xp',coalesce((r3->>'duplicate')::boolean,false) and coalesce((r3->>'xpAwarded')::int,-1)=0,'cross-source protected'),
 ('xp_ledger_unchanged',(select count(*)=0 from public.xp_ledger),'no reward rows'),
 ('historical_flag',(select bool_and(is_historical) from public.rides),'canonical historical');
end $smoke$;

do $verify$
declare failed text;
begin
 select string_agg(name,', ' order by name) into failed from vq_release_smoke where not passed;
 if failed is not null then raise exception 'production smoke failures: %',failed; end if;
end $verify$;

drop function public.vq_release_cross_insert_smoke();
delete from auth.users where id in
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into vq_release_smoke values
('cleanup_auth',(select count(*)=0 from auth.users),'temporary users removed'),
('cleanup_profiles',(select count(*)=0 from public.profiles),'trigger rows removed'),
('cleanup_rides',(select count(*)=0 from public.rides),'ride rows removed'),
('cleanup_xp',(select count(*)=0 from public.xp_ledger),'XP remains empty');
commit;
select jsonb_object_agg(name,passed order by name) as production_smoke from vq_release_smoke;
