-- 0005 used strict jsonpath (nodes without "text" broke the filter) and its "\S" regex lost
-- its backslash. Lax mode + a POSIX class fixes both.
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
  (select count(*) from public.notes n where n.question_id = q.id)::int as notes_count
from public.questions q;
