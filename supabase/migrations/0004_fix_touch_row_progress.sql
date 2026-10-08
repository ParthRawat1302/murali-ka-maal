-- progress has no created_at column, so touch_row failed on every progress update
-- (unticking a question): 'record "new" has no field "created_at"'.
create or replace function public.touch_row() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE'
     and to_jsonb(new) - 'created_by' - 'updated_by' = to_jsonb(old) - 'created_by' - 'updated_by' then
    return new;
  end if;
  new.updated_at := now();
  if tg_op = 'UPDATE' and tg_table_name <> 'progress' then
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
