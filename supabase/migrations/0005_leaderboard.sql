-- Leaderboard: solved counts per member by difficulty. Progress rows stay private (RLS);
-- this only exposes the totals, and only to signed-in members.
create or replace function public.leaderboard()
returns table (user_id uuid, display_name text, easy int, medium int, hard int, last_solved_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name,
         count(*) filter (where q.difficulty = 'easy')::int,
         count(*) filter (where q.difficulty = 'medium')::int,
         count(*) filter (where q.difficulty = 'hard')::int,
         max(pr.solved_at)
    from public.profiles p
    left join public.progress pr on pr.user_id = p.id and pr.solved
    left join public.questions q on q.id = pr.question_id
   where public.is_member()
   group by p.id, p.display_name
$$;
revoke execute on function public.leaderboard() from public, anon;
grant execute on function public.leaderboard() to authenticated;

-- has_statement: an empty editor document doesn't count as a statement.
create or replace view public.question_list with (security_invoker = true) as
select
  q.id, q.title, q.difficulty, q.source_type, q.source_label, q.source_date,
  q.leetcode_url, q.created_at, q.updated_at,
  (q.statement is not null and (
     jsonb_path_exists(q.statement, 'strict $.** ? (@.type == "text" && @.text like_regex "\S")')
     or jsonb_path_exists(q.statement, 'strict $.** ? (@.type == "image")')
  )) as has_statement,
  coalesce((select array_agg(t.name order by t.name)
              from public.question_topics qt join public.topics t on t.id = qt.topic_id
             where qt.question_id = q.id), '{}') as topics,
  (select count(*) from public.notes n where n.question_id = q.id)::int as notes_count
from public.questions q;
