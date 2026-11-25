-- Task platform: who will answer a challenge.
--
-- A Learner who challenges the AI's score is told who will look at it. That
-- is the Session's Mentor only while there is one and their window is open;
-- otherwise it falls to an Officer, and saying "your Mentor will reply"
-- would be a promise nobody is there to keep. Learners never read
-- `session_mentors`, so this answers the one thing they need from it: yes or no.

create function public.task_has_acting_mentor(p_task uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (
      select exists (select 1 from public.session_mentors m where m.session_id = t.session_id)
        and now() <= public.session_edit_until(t.session_id)
      from public.tasks t
      where t.id = p_task
        -- Only about a Task the caller may see.
        and (public.can_read_task(t.id) or public.viewer_member_id() is not null)
    ),
    false
  )
$$;

revoke execute on function public.task_has_acting_mentor(uuid) from public, anon;
grant execute on function public.task_has_acting_mentor(uuid) to authenticated, service_role;
