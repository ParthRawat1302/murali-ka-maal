-- Deleting an account sets questions.created_by/updated_by to null (on delete set null).
-- stamp_editor used to restore old.created_by on every update, which put the deleted
-- profile's id back and failed the foreign key. Keep created_by fixed only while that
-- profile still exists.
create or replace function public.stamp_editor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if tg_op = 'UPDATE' and tg_table_name = 'questions'
     and exists (select 1 from public.profiles where id = old.created_by) then
    new.created_by := old.created_by;
  end if;
  return new;
end $$;

-- Don't bump updated_at when the only change is a deleted user's id being cleared.
create or replace function public.touch_row() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE'
     and to_jsonb(new) - 'created_by' - 'updated_by' = to_jsonb(old) - 'created_by' - 'updated_by' then
    return new;
  end if;
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
