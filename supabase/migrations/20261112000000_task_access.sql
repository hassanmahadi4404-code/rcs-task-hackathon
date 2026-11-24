-- Task platform, part 1 of 3: who may see and change Tracks, Sessions, Mentors
-- and Tasks. The core (20261111000000_task_core.sql) left every table
-- deny-all; each policy below opens exactly one door. DECISIONS.md, "Access",
-- explains the choices.
--
-- Every helper is `security definer` with an empty search_path, like the
-- kit's `is_admin()`: it reads tables as its owner, so a policy that calls it
-- never recurses into another table's policies.

-- Columns -------------------------------------------------------------------

-- A Task with no `published_at` is a draft: its Mentor sees it, Learners do
-- not. The default keeps "set a Task" a one-step job.
alter table public.tasks
  add column published_at timestamptz default now(),
  add constraint tasks_title_length check (char_length(btrim(title)) between 1 and 160),
  add constraint tasks_instructions_length check (char_length(btrim(instructions)) between 1 and 8000),
  add constraint tasks_criteria_length check (char_length(btrim(grading_criteria)) between 1 and 4000);

alter table public.tracks
  add constraint tracks_name_length check (char_length(btrim(name)) between 1 and 80),
  add constraint tracks_description_length check (char_length(description) <= 400);

alter table public.sessions
  add constraint sessions_title_length check (char_length(btrim(title)) between 1 and 160);

-- The numbers the rules turn on ------------------------------------------------
-- `lib/tasks/rules.ts` repeats them for the pages; the database is the one
-- that enforces them.

-- BRIEF.md: a Mentor's say over a Session ends a week after its last deadline.
create function public.mentor_window() returns interval
language sql immutable set search_path = ''
as $$ select interval '7 days' $$;

-- Late work is taken for this long after a Task's deadline, and marked late.
-- Shorter than the Mentor's week, so a Mentor can still answer the last of it.
create function public.late_window() returns interval
language sql immutable set search_path = ''
as $$ select interval '3 days' $$;

-- Helpers -------------------------------------------------------------------

-- The signed-in person mentors this Session.
create function public.is_session_mentor(p_session uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.session_mentors m
    where m.session_id = p_session and m.email = lower(auth.jwt() ->> 'email')
  )
$$;

-- The signed-in person mentors a Session of this Track.
create function public.is_track_mentor(p_track uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.sessions s
    join public.session_mentors m on m.session_id = s.id
    where s.track_id = p_track and m.email = lower(auth.jwt() ->> 'email')
  )
$$;

-- When a Mentor's say over a Session ends. A Session with no Task yet counts
-- from the end of the day it is held (Asia/Dhaka), so its Mentor can set the
-- first one.
create function public.session_edit_until(p_session uuid) returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select max(t.deadline) from public.tasks t where t.session_id = p_session),
    (select (s.held_on + 1)::timestamp at time zone 'Asia/Dhaka'
     from public.sessions s where s.id = p_session)
  ) + public.mentor_window()
$$;

-- Officers always; a Session's Mentors, forever. "They can always look back."
create function public.can_read_session(p_session uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_admin() or public.is_session_mentor(p_session) $$;

-- Officers always; a Session's Mentors until their window closes.
create function public.can_edit_session(p_session uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or coalesce(
    public.is_session_mentor(p_session) and now() <= public.session_edit_until(p_session),
    false
  )
$$;

create function public.task_session(p_task uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select session_id from public.tasks where id = p_task $$;

create function public.can_read_task(p_task uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.can_read_session(public.task_session(p_task)), false) $$;

-- The signed-in Member has handed something in for this Task.
create function public.viewer_has_submitted(p_task uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.submissions s
    where s.task_id = p_task and s.member_id = public.viewer_member_id()
  )
$$;

create function public.task_has_submissions(p_task uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.submissions s where s.task_id = p_task) $$;

create function public.session_has_submissions(p_session uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.submissions s
    join public.tasks t on t.id = s.task_id
    where t.session_id = p_session
  )
$$;

create function public.track_has_submissions(p_track uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.submissions s
    join public.tasks t on t.id = s.task_id
    join public.sessions n on n.id = t.session_id
    where n.track_id = p_track
  )
$$;

-- Tracks --------------------------------------------------------------------
-- Members browse every Track. A Mentor who is not a Member sees only the
-- Tracks they mentor in. Officers run them.

create policy "Members, the Track's Mentors and Officers read Tracks"
on public.tracks for select to authenticated
using (
  public.is_admin()
  or public.viewer_member_id() is not null
  or public.is_track_mentor(id)
);

create policy "Officers add Tracks"
on public.tracks for insert to authenticated
with check (public.is_admin());

create policy "Officers change Tracks"
on public.tracks for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Deleting cascades to Submissions, so it is only for a Track nobody has
-- handed work in to. Archive the others.
create policy "Officers delete Tracks that hold no Submissions"
on public.tracks for delete to authenticated
using (public.is_admin() and not public.track_has_submissions(id));

-- Sessions ------------------------------------------------------------------
-- Officers plan them; Mentors do not move or rename them.

create policy "Members, the Session's Mentors and Officers read Sessions"
on public.sessions for select to authenticated
using (
  public.is_admin()
  or public.viewer_member_id() is not null
  or public.is_session_mentor(id)
);

create policy "Officers add Sessions"
on public.sessions for insert to authenticated
with check (public.is_admin());

create policy "Officers change Sessions"
on public.sessions for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "Officers delete Sessions that hold no Submissions"
on public.sessions for delete to authenticated
using (public.is_admin() and not public.session_has_submissions(id));

-- Session Mentors -----------------------------------------------------------
-- An email is personal data: Learners never read this table. A Mentor sees
-- who else mentors their own Session.

create policy "Officers and the Session's Mentors read its Mentors"
on public.session_mentors for select to authenticated
using (public.can_read_session(session_id));

create policy "Officers name Mentors"
on public.session_mentors for insert to authenticated
with check (public.is_admin());

create policy "Officers remove Mentors"
on public.session_mentors for delete to authenticated
using (public.is_admin());

-- Tasks ---------------------------------------------------------------------
-- A Learner reads a published Task, and keeps reading one they handed work
-- in to even if it is later unpublished.

create policy "Mentors and Officers read their Tasks; Members read published ones"
on public.tasks for select to authenticated
using (
  public.can_read_session(session_id)
  or (
    public.viewer_member_id() is not null
    and ((published_at is not null and published_at <= now()) or public.viewer_has_submitted(id))
  )
);

create policy "Mentors in their window and Officers set Tasks"
on public.tasks for insert to authenticated
with check (public.can_edit_session(session_id));

create policy "Mentors in their window and Officers change Tasks"
on public.tasks for update to authenticated
using (public.can_edit_session(session_id))
with check (public.can_edit_session(session_id));

-- Nothing a Learner hands in may be lost: a Task with Submissions stays.
create policy "Mentors in their window and Officers delete Tasks that hold no Submissions"
on public.tasks for delete to authenticated
using (public.can_edit_session(session_id) and not public.task_has_submissions(id));

-- Nobody signed out runs these ------------------------------------------------

revoke execute on function
  public.is_session_mentor(uuid),
  public.is_track_mentor(uuid),
  public.session_edit_until(uuid),
  public.can_read_session(uuid),
  public.can_edit_session(uuid),
  public.task_session(uuid),
  public.can_read_task(uuid),
  public.viewer_has_submitted(uuid),
  public.task_has_submissions(uuid),
  public.session_has_submissions(uuid),
  public.track_has_submissions(uuid)
from public, anon;

grant execute on function
  public.is_session_mentor(uuid),
  public.is_track_mentor(uuid),
  public.session_edit_until(uuid),
  public.can_read_session(uuid),
  public.can_edit_session(uuid),
  public.task_session(uuid),
  public.can_read_task(uuid),
  public.viewer_has_submitted(uuid),
  public.task_has_submissions(uuid),
  public.session_has_submissions(uuid),
  public.track_has_submissions(uuid)
to authenticated, service_role;
