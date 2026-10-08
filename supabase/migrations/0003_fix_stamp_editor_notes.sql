-- 0002 read old.created_by in a single condition with tg_table_name = 'questions', but
-- plpgsql doesn't short-circuit field lookups, so every notes update failed
-- ('record "old" has no field "created_by"'). Nest the check.
create or replace function public.stamp_editor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if tg_op = 'UPDATE' and tg_table_name = 'questions' then
    if exists (select 1 from public.profiles where id = old.created_by) then
      new.created_by := old.created_by;
    end if;
  end if;
  return new;
end $$;
