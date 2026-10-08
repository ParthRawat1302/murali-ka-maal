-- AlgoWeb initial schema: questions, topics, notes, progress, audit log, sessions, storage.
-- Every policy requires the caller to have a row in public.profiles (created only by
-- scripts/seed-users.ts with the secret key), so stray self-signups see nothing.

-- ───────────────────────── types ─────────────────────────
create type public.difficulty as enum ('easy', 'medium', 'hard');
create type public.source_type as enum ('email', 'test', 'class_notes', 'domjudge', 'other');
create type public.note_visibility as enum ('public', 'private');

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username = lower(username)),
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ───────────────────────── questions ─────────────────────────
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  difficulty public.difficulty not null default 'medium',
  source_type public.source_type not null default 'other',
  source_label text,
  source_date date not null default (now() at time zone 'Asia/Kolkata')::date,
  leetcode_url text,
  leetcode_slug text,
  statement jsonb,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questions_source_date_idx on public.questions (source_date desc, created_at desc);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);
create unique index topics_name_lower_idx on public.topics (lower(name));

create table public.question_topics (
  question_id uuid not null references public.questions (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  primary key (question_id, topic_id)
);
create index question_topics_topic_idx on public.question_topics (topic_id);

-- ───────────────────────── notes ─────────────────────────
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  visibility public.note_visibility not null default 'public',
  title text not null default 'Untitled note',
  content jsonb,
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_question_idx on public.notes (question_id, created_at);

-- ───────────────────────── progress ─────────────────────────
create table public.progress (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  solved boolean not null default false,
  solved_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- ───────────────────────── audit log ─────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id uuid not null,
  question_id uuid,            -- no FK so history survives deletes
  action text not null,        -- insert | update | delete | topic_add | topic_remove | import
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  changes jsonb not null default '{}'::jsonb
);
create index audit_log_question_idx on public.audit_log (question_id, changed_at desc);
create index audit_log_user_idx on public.audit_log (changed_by, changed_at desc);

-- ───────────────────────── sessions (analytics) ─────────────────────────
create table public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  user_agent text
);
create index app_sessions_user_idx on public.app_sessions (user_id, started_at desc);
create index app_sessions_started_idx on public.app_sessions (started_at desc);

-- ───────────────────────── housekeeping triggers ─────────────────────────
create or replace function public.touch_row() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

create or replace function public.stamp_editor() returns trigger
language plpgsql as $$
begin
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if tg_op = 'UPDATE' and tg_table_name = 'questions' then
    new.created_by := old.created_by;
  end if;
  return new;
end $$;

create trigger questions_touch before update on public.questions for each row execute function public.touch_row();
create trigger questions_editor before insert or update on public.questions for each row execute function public.stamp_editor();
create trigger notes_touch before update on public.notes for each row execute function public.touch_row();
create trigger notes_editor before insert or update on public.notes for each row execute function public.stamp_editor();
create trigger progress_touch before update on public.progress for each row execute function public.touch_row();

-- Only the owner may change a note's owner or visibility.
create or replace function public.guard_note() returns trigger
language plpgsql as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'note owner cannot change';
  end if;
  if new.visibility <> old.visibility and auth.uid() is not null and auth.uid() <> old.owner_id then
    raise exception 'only the owner can change note visibility';
  end if;
  if new.question_id <> old.question_id then
    raise exception 'note cannot move to another question';
  end if;
  return new;
end $$;
create trigger notes_guard before update on public.notes for each row execute function public.guard_note();

-- solved_at follows solved
create or replace function public.stamp_solved() returns trigger
language plpgsql as $$
begin
  if new.solved and (tg_op = 'INSERT' or not old.solved) then
    new.solved_at := now();
  elsif not new.solved then
    new.solved_at := null;
  end if;
  return new;
end $$;
create trigger progress_solved before insert or update on public.progress for each row execute function public.stamp_solved();

-- ───────────────────────── audit triggers ─────────────────────────
-- Rich-text columns are summarised, not copied. Repeated autosaves by the same
-- person on the same row within 10 minutes are folded into one audit entry.
create or replace function public.audit_diff(old_row jsonb, new_row jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_object_agg(k, jsonb_build_object(
           'from', case when k in ('statement', 'content') then to_jsonb('(rich text)'::text) else old_row -> k end,
           'to',   case when k in ('statement', 'content') then to_jsonb('(rich text)'::text) else new_row -> k end)), '{}'::jsonb)
  from jsonb_object_keys(coalesce(new_row, old_row)) k
  where k not in ('updated_at', 'updated_by', 'created_at', 'created_by')
    and (old_row -> k) is distinct from (new_row -> k)
$$;

create or replace function public.audit_write(
  p_table text, p_row uuid, p_question uuid, p_action text, p_changes jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_recent bigint;
begin
  if p_action = 'update' then
    if p_changes = '{}'::jsonb then
      return;
    end if;
    select id into v_recent from public.audit_log
     where table_name = p_table and row_id = p_row and action = 'update'
       and changed_by is not distinct from v_user
       and changed_at > now() - interval '10 minutes'
     order by changed_at desc limit 1;
    if v_recent is not null then
      -- keep the earliest "from", take the latest "to"
      update public.audit_log a
         set changed_at = now(),
             changes = (
               select jsonb_object_agg(k, jsonb_build_object(
                        'from', coalesce(a.changes -> k -> 'from', p_changes -> k -> 'from'),
                        'to',   coalesce(p_changes -> k -> 'to', a.changes -> k -> 'to')))
               from (select jsonb_object_keys(a.changes) k
                     union select jsonb_object_keys(p_changes)) keys)
       where a.id = v_recent;
      return;
    end if;
  end if;
  insert into public.audit_log (table_name, row_id, question_id, action, changed_by, changes)
  values (p_table, p_row, p_question, p_action, v_user, p_changes);
end $$;

create or replace function public.audit_questions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.audit_write('questions', new.id, new.id, 'insert', jsonb_build_object('title', new.title));
  elsif tg_op = 'UPDATE' then
    perform public.audit_write('questions', new.id, new.id, 'update', public.audit_diff(to_jsonb(old), to_jsonb(new)));
  else
    perform public.audit_write('questions', old.id, old.id, 'delete', jsonb_build_object('title', old.title));
  end if;
  return null;
end $$;
create trigger questions_audit after insert or update or delete on public.questions
  for each row execute function public.audit_questions();

create or replace function public.audit_question_topics() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_name text;
begin
  r := coalesce(new, old);
  select name into v_name from public.topics where id = r.topic_id;
  -- skip cascades from a deleted question
  if tg_op = 'DELETE' and not exists (select 1 from public.questions where id = r.question_id) then
    return null;
  end if;
  perform public.audit_write('question_topics', r.question_id, r.question_id,
    case when tg_op = 'INSERT' then 'topic_add' else 'topic_remove' end,
    jsonb_build_object('topic', v_name));
  return null;
end $$;
create trigger question_topics_audit after insert or delete on public.question_topics
  for each row execute function public.audit_question_topics();

-- Only public notes are audited; private notes stay private.
create or replace function public.audit_notes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.visibility = 'public' then
      perform public.audit_write('notes', new.id, new.question_id, 'insert', jsonb_build_object('title', new.title));
    end if;
  elsif tg_op = 'UPDATE' then
    if new.visibility = 'public' or old.visibility = 'public' then
      perform public.audit_write('notes', new.id, new.question_id, 'update', public.audit_diff(to_jsonb(old), to_jsonb(new)));
    end if;
  else
    if old.visibility = 'public' and exists (select 1 from public.questions where id = old.question_id) then
      perform public.audit_write('notes', old.id, old.question_id, 'delete', jsonb_build_object('title', old.title));
    end if;
  end if;
  return null;
end $$;
create trigger notes_audit after insert or update or delete on public.notes
  for each row execute function public.audit_notes();

-- ───────────────────────── views ─────────────────────────
create view public.question_list with (security_invoker = true) as
select
  q.id, q.title, q.difficulty, q.source_type, q.source_label, q.source_date,
  q.leetcode_url, q.created_at, q.updated_at,
  (q.statement is not null) as has_statement,
  coalesce((select array_agg(t.name order by t.name)
              from public.question_topics qt join public.topics t on t.id = qt.topic_id
             where qt.question_id = q.id), '{}') as topics,
  (select count(*) from public.notes n where n.question_id = q.id)::int as notes_count
from public.questions q;

-- One row per user per day (IST) with solves and edits; RLS of the base tables applies.
create view public.activity_days with (security_invoker = true) as
select user_id, day, sum(solves)::int as solves, sum(edits)::int as edits
from (
  select user_id, (solved_at at time zone 'Asia/Kolkata')::date as day, 1 as solves, 0 as edits
    from public.progress where solved and solved_at is not null
  union all
  select changed_by, (changed_at at time zone 'Asia/Kolkata')::date, 0, 1
    from public.audit_log where changed_by is not null
) e
group by user_id, day;

-- ───────────────────────── RPC: set topics for a question ─────────────────────────
create or replace function public.set_question_topics(p_question uuid, p_names text[])
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_ids uuid[];
begin
  if not public.is_member() then
    raise exception 'not allowed';
  end if;
  insert into public.topics (name)
  select distinct btrim(n) from unnest(p_names) n
   where length(btrim(n)) > 0
     and not exists (select 1 from public.topics t where lower(t.name) = lower(btrim(n)))
  on conflict do nothing;

  select coalesce(array_agg(t.id), '{}') into v_ids
    from public.topics t
   where lower(t.name) in (select lower(btrim(n)) from unnest(p_names) n);

  delete from public.question_topics where question_id = p_question and not (topic_id = any (v_ids));
  insert into public.question_topics (question_id, topic_id)
  select p_question, unnest(v_ids)
  on conflict do nothing;
end $$;

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.topics enable row level security;
alter table public.question_topics enable row level security;
alter table public.notes enable row level security;
alter table public.progress enable row level security;
alter table public.audit_log enable row level security;
alter table public.app_sessions enable row level security;

create policy "members read profiles" on public.profiles for select to authenticated using (public.is_member());

create policy "members read questions" on public.questions for select to authenticated using (public.is_member());
create policy "members add questions" on public.questions for insert to authenticated with check (public.is_member());
create policy "members edit questions" on public.questions for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "members delete questions" on public.questions for delete to authenticated using (public.is_member());

create policy "members read topics" on public.topics for select to authenticated using (public.is_member());
create policy "members add topics" on public.topics for insert to authenticated with check (public.is_member());
create policy "members edit topics" on public.topics for update to authenticated using (public.is_member()) with check (public.is_member());

create policy "members read question topics" on public.question_topics for select to authenticated using (public.is_member());
create policy "members add question topics" on public.question_topics for insert to authenticated with check (public.is_member());
create policy "members remove question topics" on public.question_topics for delete to authenticated using (public.is_member());

create policy "read public or own notes" on public.notes for select to authenticated
  using (public.is_member() and (visibility = 'public' or owner_id = auth.uid()));
create policy "add own notes" on public.notes for insert to authenticated
  with check (public.is_member() and owner_id = auth.uid());
create policy "edit public or own notes" on public.notes for update to authenticated
  using (public.is_member() and (visibility = 'public' or owner_id = auth.uid()))
  with check (public.is_member() and (visibility = 'public' or owner_id = auth.uid()));
create policy "delete own notes" on public.notes for delete to authenticated
  using (public.is_member() and owner_id = auth.uid());

create policy "own progress" on public.progress for all to authenticated
  using (public.is_member() and user_id = auth.uid())
  with check (public.is_member() and user_id = auth.uid());

create policy "members read audit" on public.audit_log for select to authenticated using (public.is_member());

create policy "own or admin sessions" on public.app_sessions for select to authenticated
  using (public.is_member() and (user_id = auth.uid() or public.is_admin()));
create policy "start own session" on public.app_sessions for insert to authenticated
  with check (public.is_member() and user_id = auth.uid());
create policy "update own session" on public.app_sessions for update to authenticated
  using (public.is_member() and user_id = auth.uid())
  with check (public.is_member() and user_id = auth.uid());

-- No anonymous access to anything in public.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;

-- ───────────────────────── storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

create policy "members list media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_member());
create policy "members upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "members update own media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "members delete own media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────────────────── realtime ─────────────────────────
alter publication supabase_realtime add table public.questions, public.notes;

-- ───────────────────────── seed topics ─────────────────────────
insert into public.topics (name) values
  ('Array'), ('String'), ('Hash Table'), ('Dynamic Programming'), ('Math'), ('Sorting'),
  ('Greedy'), ('Depth-First Search'), ('Breadth-First Search'), ('Binary Search'), ('Tree'),
  ('Binary Tree'), ('Binary Search Tree'), ('Matrix'), ('Two Pointers'), ('Bit Manipulation'),
  ('Stack'), ('Queue'), ('Heap (Priority Queue)'), ('Graph'), ('Prefix Sum'), ('Simulation'),
  ('Design'), ('Counting'), ('Backtracking'), ('Sliding Window'), ('Union Find'), ('Linked List'),
  ('Monotonic Stack'), ('Trie'), ('Recursion'), ('Divide and Conquer'), ('Memoization'),
  ('Topological Sort'), ('Segment Tree'), ('Shortest Path'), ('Bitmask'), ('Combinatorics'),
  ('Number Theory'), ('String Matching'), ('Geometry'), ('Game Theory'), ('Monotonic Queue'),
  ('Minimum Spanning Tree'), ('Binary Indexed Tree'), ('Doubly-Linked List'), ('Hashing')
on conflict do nothing;
