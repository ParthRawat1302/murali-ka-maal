-- The method the teacher intends for a question in a given email / class / test.
-- The same question can be given again later with a different intended topic
-- (e.g. Reverse Pairs: Binary Search on 12 Aug, Binary Indexed Tree on 21 Sep).
-- Synced from content/intents.json by scripts/sync-intents.ts.
create table public.question_intents (
  question_id uuid not null references public.questions (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  source_type public.source_type not null,
  source_label text,
  source_date date not null,
  primary key (question_id, topic_id, source_date)
);
alter table public.question_intents enable row level security;
create policy "members read intents" on public.question_intents for select to authenticated using (public.is_member());
create policy "members add intents" on public.question_intents for insert to authenticated with check (public.is_member());
create policy "members remove intents" on public.question_intents for delete to authenticated using (public.is_member());
revoke all on public.question_intents from anon;

create or replace view public.question_list with (security_invoker = true) as
select
  q.id, q.title, q.difficulty, q.source_type, q.source_label, q.source_date,
  q.leetcode_url, q.created_at, q.updated_at,
  (q.statement is not null and (
     jsonb_path_exists(q.statement, 'lax $.**.text ? (@ like_regex "[^[:space:]]")')
     or jsonb_path_exists(q.statement, 'lax $.** ? (@.type == "image")')
  )) as has_statement,
  coalesce((select array_agg(t.name order by t.name)
              from public.question_topics qt join public.topics t on t.id = qt.topic_id
             where qt.question_id = q.id), '{}') as topics,
  (select count(*) from public.notes n where n.question_id = q.id)::int as notes_count,
  coalesce((select jsonb_agg(jsonb_build_object(
                     'topic', t.name, 'source_type', i.source_type,
                     'source_label', i.source_label, 'source_date', i.source_date)
                   order by i.source_date, t.name)
              from public.question_intents i join public.topics t on t.id = i.topic_id
             where i.question_id = q.id), '[]'::jsonb) as intents
from public.questions q;
