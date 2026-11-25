-- Task platform: the leaderboard.
--
-- A Learner's work and its Evaluation stay theirs: no policy changes here,
-- and nobody gains a row of `submissions`, `evaluations` or `members`. The
-- leaderboard is one function that gives a name and three totals per Learner,
-- to the people who are part of this: Members, Mentors and Officers. It gives
-- no roll, email or phone, no score for any single Task, and nothing at all to
-- someone who is none of the three. DECISIONS.md, "The leaderboard".

-- The signed-in person is a Member, an Officer, or a Mentor of some Session.
create function public.can_see_leaderboard() returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin()
    or public.viewer_member_id() is not null
    or exists (
      select 1 from public.session_mentors m where m.email = lower(auth.jwt() ->> 'email')
    )
$$;

-- One row per Learner with a score: the scores of their latest attempt at each
-- Task, added up. A Mentor's score stands over the AI's; an attempt nobody has
-- scored yet counts for nothing until it is. `p_track` keeps to one Track.
create function public.leaderboard(p_track uuid default null)
returns table (name text, points integer, tasks integer, average integer, is_viewer boolean)
language sql stable security definer set search_path = ''
as $$
  with latest as (
    select distinct on (s.member_id, s.task_id)
      s.member_id,
      coalesce(e.override_score, case when e.status = 'done' then e.ai_score end) as score
    from public.submissions s
    join public.evaluations e on e.submission_id = s.id
    join public.tasks t on t.id = s.task_id
    join public.sessions n on n.id = t.session_id
    where p_track is null or n.track_id = p_track
    order by s.member_id, s.task_id, s.created_at desc, s.id
  )
  select
    m.name,
    sum(l.score)::integer,
    count(*)::integer,
    round(avg(l.score))::integer,
    coalesce(m.id = public.viewer_member_id(), false)
  from latest l
  join public.members m on m.id = l.member_id
  where l.score is not null and public.can_see_leaderboard()
  group by m.id, m.name
  order by 2 desc, 3 desc, m.name
$$;

revoke execute on function public.can_see_leaderboard(), public.leaderboard(uuid) from public, anon;
grant execute on function public.can_see_leaderboard(), public.leaderboard(uuid) to authenticated, service_role;
