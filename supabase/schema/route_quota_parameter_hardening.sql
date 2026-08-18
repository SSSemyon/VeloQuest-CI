-- The Route Engine quota remains user-scoped through auth.uid(), but callers
-- may not choose weaker rate-limit parameters than the server contract.

create or replace function public.consume_route_generation_quota(
  p_limit integer default 6,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_row private.route_generation_rate_limits%rowtype;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;
  if p_limit <> 6 or p_window_seconds <> 60 then
    raise exception 'invalid_rate_limit';
  end if;

  insert into private.route_generation_rate_limits (user_id, window_started_at, request_count)
  values (v_user_id, v_now, 1)
  on conflict (user_id) do nothing
  returning * into v_row;

  if found then return true; end if;

  select * into v_row
  from private.route_generation_rate_limits
  where user_id = v_user_id
  for update;

  if v_row.window_started_at <= v_now - make_interval(secs => p_window_seconds) then
    update private.route_generation_rate_limits
    set window_started_at = v_now, request_count = 1
    where user_id = v_user_id;
    return true;
  end if;

  if v_row.request_count >= p_limit then return false; end if;

  update private.route_generation_rate_limits
  set request_count = request_count + 1
  where user_id = v_user_id;
  return true;
end;
$$;

revoke execute on function public.consume_route_generation_quota(integer, integer) from public, anon;
grant execute on function public.consume_route_generation_quota(integer, integer) to authenticated;
