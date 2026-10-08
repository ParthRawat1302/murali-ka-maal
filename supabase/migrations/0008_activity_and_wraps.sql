-- Active time, per user per day (IST), optionally per question. Written only through log_activity().
create table public.activity_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  question_id uuid references public.questions (id) on delete set null,
  seconds int not null default 0 check (seconds >= 0)
);
create unique index activity_log_key on public.activity_log
  (user_id, day, coalesce(question_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index activity_log_user_day on public.activity_log (user_id, day);
alter table public.activity_log enable row level security;
create policy "own activity" on public.activity_log for select to authenticated
  using (public.is_member() and user_id = auth.uid());
revoke all on public.activity_log from anon;

-- Called by the browser's heartbeat. Adds at most 2 minutes per call to today's row.
create or replace function public.log_activity(p_seconds int, p_question uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Kolkata')::date;
  v_q uuid := p_question;
  v_secs int := least(greatest(coalesce(p_seconds, 0), 0), 120);
begin
  if not public.is_member() or v_secs = 0 then
    return;
  end if;
  if v_q is not null and not exists (select 1 from public.questions where id = v_q) then
    v_q := null;
  end if;
  update public.activity_log
     set seconds = seconds + v_secs
   where user_id = v_user and day = v_day and question_id is not distinct from v_q;
  if not found then
    insert into public.activity_log (user_id, day, question_id, seconds) values (v_user, v_day, v_q, v_secs)
    on conflict do nothing;
    if not found then
      update public.activity_log set seconds = seconds + v_secs
       where user_id = v_user and day = v_day and question_id is not distinct from v_q;
    end if;
  end if;
end $$;
revoke execute on function public.log_activity(int, uuid) from public, anon;
grant execute on function public.log_activity(int, uuid) to authenticated;

-- Backfill from the older session tracking (rough: session length, capped at 4h, on its start day).
insert into public.activity_log (user_id, day, question_id, seconds)
select user_id, (started_at at time zone 'Asia/Kolkata')::date, null,
       sum(least(greatest(extract(epoch from (last_seen_at - started_at)), 0), 4 * 3600))::int
  from public.app_sessions
 group by 1, 2
having sum(least(greatest(extract(epoch from (last_seen_at - started_at)), 0), 4 * 3600)) > 0;

-- Wraps a member has opened or dismissed (so the home banner doesn't come back).
create table public.wrap_views (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  wrap_key text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, wrap_key)
);
alter table public.wrap_views enable row level security;
create policy "own wrap views" on public.wrap_views for all to authenticated
  using (public.is_member() and user_id = auth.uid())
  with check (public.is_member() and user_id = auth.uid());
revoke all on public.wrap_views from anon;
