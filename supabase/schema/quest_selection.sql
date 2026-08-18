-- Server-authoritative quest selection. A selected quest exists before the
-- first ride, so it survives cold restart and device changes.

create unique index if not exists quest_runs_one_active_per_user_idx
on public.quest_runs (user_id) where status = 'active';

create or replace function public.activate_quest_alpha(
  p_template_code text,
  p_confirm_abandon boolean default false
)
returns table (code text, progress_value numeric, target_value numeric, reward_xp integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.quest_templates%rowtype;
  v_active public.quest_runs%rowtype;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;

  select * into v_template
  from public.quest_templates template
  where template.code = p_template_code and template.enabled = true;
  if not found then raise exception 'invalid_quest'; end if;

  select * into v_active
  from public.quest_runs
  where user_id = v_user_id and status = 'active'
  for update;

  if found and v_active.template_code = p_template_code then
    return query select v_active.template_code, v_active.progress_value, v_active.target_value, v_active.reward_xp;
    return;
  end if;

  if found and v_active.progress_value > 0 and not p_confirm_abandon then
    raise exception 'active_quest_has_progress';
  end if;

  if found then
    update public.quest_runs set status = 'abandoned' where id = v_active.id;
  end if;

  insert into public.quest_runs (user_id, template_code, target_value, progress_value, reward_xp, status)
  values (v_user_id, v_template.code, v_template.default_target, 0, v_template.reward_xp, 'active')
  returning template_code, quest_runs.progress_value, quest_runs.target_value, quest_runs.reward_xp
  into code, progress_value, target_value, reward_xp;
  return next;
end;
$$;

revoke all on function public.activate_quest_alpha(text, boolean) from public, anon;
grant execute on function public.activate_quest_alpha(text, boolean) to authenticated;
