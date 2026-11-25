-- Task platform: one queue for the AI.
--
-- Deadline night: everyone submits in the same hour, and a free model takes
-- only so many requests a minute. Asking it for every Submission at once gets
-- most of them refused. So Evaluations wait in one line, oldest first, and
-- the line moves at a pace the model can take:
--
--   - `claim_next_evaluation` hands out the oldest waiting Evaluation, and
--     only when the next slot has come. Every caller goes through one locked
--     row, so the pace holds however many requests arrive together.
--   - anyone's visit moves the line (the server calls it for whoever is
--     looking), so a Learner who closed the tab is not left behind.
--   - `evaluation_queue` tells a Learner how many are ahead of them.
--   - a newer attempt takes the place of an older one that has not been read.
--
-- This replaces the two functions part 3 used to pick work.

drop function public.claim_evaluation(uuid);
drop function public.due_evaluations(integer, uuid);

-- When the next request to the model may be made.
alter table public.evaluator_state
  add column next_slot_at timestamptz not null default now();

-- An attempt the AI never read, because its Learner sent a newer one first.
alter table public.evaluations drop constraint evaluations_failure_reason_check;
alter table public.evaluations add constraint evaluations_failure_reason_check
  check (failure_reason in ('quota', 'timeout', 'invalid_output', 'unreadable', 'unavailable', 'superseded'));

-- Take the oldest waiting Evaluation for one run, if the next slot has come.
-- `p_interval_ms` is the pace: the least time between two requests (0 for an
-- evaluator with no limit). `p_task` keeps to one Task. Null when there is
-- nothing to take, the slot has not come, or the evaluator is paused.
create function public.claim_next_evaluation(p_interval_ms integer, p_task uuid default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_state public.evaluator_state;
  v_submission uuid;
begin
  -- Everyone waits here in turn, so two callers never take the same slot.
  select * into v_state from public.evaluator_state where id for update;
  if v_state.paused_until > now() or v_state.next_slot_at > now() then
    return null;
  end if;

  select e.submission_id into v_submission
  from public.evaluations e
  join public.submissions s on s.id = e.submission_id
  where e.status = 'pending'
    and e.next_attempt_at <= now()
    and (e.locked_until is null or e.locked_until < now())
    and (p_task is null or s.task_id = p_task)
  order by s.created_at, s.id
  limit 1
  for update of e skip locked;

  if v_submission is null then
    return null;
  end if;

  update public.evaluations
  set attempts = attempts + 1, locked_until = now() + interval '2 minutes'
  where submission_id = v_submission;

  update public.evaluator_state
  set next_slot_at = now() + make_interval(secs => greatest(p_interval_ms, 0) / 1000.0)
  where id;

  return v_submission;
end
$$;

-- How long the line is in front of one Submission, for whoever may read it:
-- the number of Evaluations still waiting that were submitted before it, and
-- when the line next moves. A count, and nothing about whose they are.
create function public.evaluation_queue(p_submission uuid)
returns table (ahead integer, next_slot_at timestamptz, paused_until timestamptz)
language sql stable security definer set search_path = ''
as $$
  select
    (
      select count(*)::integer
      from public.evaluations e
      join public.submissions o on o.id = e.submission_id
      where e.status = 'pending' and (o.created_at, o.id) < (s.created_at, s.id)
    ),
    st.next_slot_at,
    st.paused_until
  from public.submissions s
  cross join public.evaluator_state st
  where s.id = p_submission and public.can_read_submission(p_submission)
$$;

-- Saving a Submission: its Evaluation starts waiting, and an older attempt by
-- the same Learner at the same Task that nobody has read yet stops waiting.
-- The latest attempt is the one that counts, so reading the older one would
-- only spend a place in the line.
create or replace function public.submissions_after_insert() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.evaluations (submission_id) values (new.id)
  on conflict (submission_id) do nothing;

  update public.evaluations e
  set status = 'failed', failure_reason = 'superseded', locked_until = null
  from public.submissions s
  where s.id = e.submission_id
    and s.task_id = new.task_id
    and s.member_id = new.member_id
    and s.id <> new.id
    and s.created_at <= new.created_at
    and e.status = 'pending'
    and (e.locked_until is null or e.locked_until < now());

  return null;
end
$$;

revoke execute on function public.claim_next_evaluation(integer, uuid), public.evaluation_queue(uuid) from public, anon;
revoke execute on function public.claim_next_evaluation(integer, uuid) from authenticated;
grant execute on function public.claim_next_evaluation(integer, uuid) to service_role;
grant execute on function public.evaluation_queue(uuid) to authenticated, service_role;
