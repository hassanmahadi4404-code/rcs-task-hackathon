-- Task platform: a Track's Sessions as a timeline.
--
-- The society plans a whole Track ahead: every Session in order, each with
-- its syllabus, most without a date yet. The core gives a Session a title and
-- a date; this adds what the plan needs on top. Nothing here changes who may
-- see or do what.

alter table public.tracks
  -- Tracks are shown in the order they are taught, not by name.
  add column position integer not null default 0 check (position between 0 and 999);

alter table public.sessions
  -- What the Session covers: the syllabus line Learners and Mentors plan by.
  add column topic text not null default '' check (char_length(topic) <= 600),
  -- Its place in the Track: 1 for the first Session.
  add column position integer not null default 0 check (position between 0 and 999),
  -- The date is not settled. `held_on` is `not null` in the core, so it still
  -- holds a date, but nobody is shown it and nothing is timed from it.
  add column date_tbc boolean not null default false;

create index sessions_track_position_idx on public.sessions (track_id, position);

-- A Session whose date is not settled and that has no Task yet has not
-- happened, so its Mentors' window has not started to close.
create or replace function public.session_edit_until(p_session uuid) returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select max(t.deadline) from public.tasks t where t.session_id = p_session),
    (select case
       when s.date_tbc then 'infinity'::timestamptz
       else (s.held_on + 1)::timestamp at time zone 'Asia/Dhaka'
     end
     from public.sessions s where s.id = p_session)
  ) + public.mentor_window()
$$;
