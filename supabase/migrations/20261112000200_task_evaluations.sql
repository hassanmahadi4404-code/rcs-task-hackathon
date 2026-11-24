-- Task platform, part 3 of 3: Evaluations. The AI's half of a row is written
-- only by the server's service role, after it has run `evaluate()`: a Learner
-- holds the public key and their own session, and must not be able to mark
-- their own work. The Mentor's half is written only through the two override
-- functions below. Nobody has an insert, update or delete policy.

-- Columns -------------------------------------------------------------------

alter table public.evaluations
  -- How many times the evaluator has been run for this Submission.
  add column attempts integer not null default 0,
  -- A `pending` row is not tried again before this.
  add column next_attempt_at timestamptz not null default now(),
  -- Held while one request runs the evaluator, so two never read the same work.
  add column locked_until timestamptz,
  -- Why the last run did not finish; null once it has.
  add column failure_reason text
    check (failure_reason in ('quota', 'timeout', 'invalid_output', 'unreadable', 'unavailable')),
  -- The Submission reads like an attempt to steer the AI. For the Mentor.
  add column flagged boolean not null default false;

create index evaluations_pending_idx on public.evaluations (next_attempt_at) where status = 'pending';

create function public.evaluations_touch() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger evaluations_touch
before update on public.evaluations
for each row execute function public.evaluations_touch();

-- Reading -------------------------------------------------------------------

create function public.can_read_submission(p_submission uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.submissions s
    where s.id = p_submission
      and (s.member_id = public.viewer_member_id() or public.can_read_task(s.task_id))
  )
$$;

create policy "An Evaluation is read by whoever may read its Submission"
on public.evaluations for select to authenticated
using (public.can_read_submission(submission_id));

-- The Mentor's word ---------------------------------------------------------
-- A score, a note, or both. The Learner sees it above the AI's.

create function public.submission_session(p_submission uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select t.session_id
  from public.submissions s
  join public.tasks t on t.id = s.task_id
  where s.id = p_submission
$$;

create function public.set_evaluation_override(p_submission uuid, p_score integer, p_note text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(btrim(p_note), '');
begin
  -- The same refusal for "not yours" and "does not exist".
  if not coalesce(public.can_edit_session(public.submission_session(p_submission)), false) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_score is null and v_note is null then
    raise exception 'override_empty';
  end if;
  if p_score is not null and p_score not between 0 and 100 then
    raise exception 'score_out_of_range';
  end if;
  if char_length(v_note) > 2000 then
    raise exception 'note_too_long';
  end if;

  update public.evaluations
  set override_score = p_score,
      override_note = v_note,
      overridden_by = lower(auth.jwt() ->> 'email'),
      overridden_at = now()
  where submission_id = p_submission;
end
$$;

create function public.clear_evaluation_override(p_submission uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not coalesce(public.can_edit_session(public.submission_session(p_submission)), false) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.evaluations
  set override_score = null, override_note = null, overridden_by = null, overridden_at = null
  where submission_id = p_submission;
end
$$;

-- Ask the AI to read a Submission again, from the start.
create function public.request_reevaluation(p_submission uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not coalesce(public.can_edit_session(public.submission_session(p_submission)), false) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.evaluations
  set status = 'pending', ai_score = null, ai_feedback = null, model = null, flagged = false,
      attempts = 0, next_attempt_at = now(), locked_until = null, failure_reason = null
  where submission_id = p_submission
    and (status <> 'pending' or locked_until is null or locked_until < now());
end
$$;

revoke execute on function
  public.evaluations_touch(),
  public.can_read_submission(uuid),
  public.submission_session(uuid),
  public.set_evaluation_override(uuid, integer, text),
  public.clear_evaluation_override(uuid),
  public.request_reevaluation(uuid)
from public, anon;

grant execute on function
  public.can_read_submission(uuid),
  public.submission_session(uuid),
  public.set_evaluation_override(uuid, integer, text),
  public.clear_evaluation_override(uuid),
  public.request_reevaluation(uuid)
to authenticated, service_role;

-- The server's side -----------------------------------------------------------
-- Everything below is for the service role only.

-- One row: when the AI's quota ran out, nothing is tried until it is back,
-- instead of every waiting Submission finding that out for itself.
create table public.evaluator_state (
  id boolean primary key default true check (id),
  paused_until timestamptz
);
insert into public.evaluator_state default values;
alter table public.evaluator_state enable row level security;
revoke all on table public.evaluator_state from anon, authenticated;

-- Take a waiting Evaluation for one run. False when it is not waiting, not
-- due, already being run, or the evaluator is paused.
create function public.claim_evaluation(p_submission uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  update public.evaluations e
  set attempts = e.attempts + 1, locked_until = now() + interval '2 minutes'
  where e.submission_id = p_submission
    and e.status = 'pending'
    and e.next_attempt_at <= now()
    and (e.locked_until is null or e.locked_until < now())
    and not exists (select 1 from public.evaluator_state s where s.paused_until > now());
  return found;
end
$$;

-- Waiting Evaluations that are due, oldest first; none while the evaluator is
-- paused. `p_task` narrows it to one Task.
create function public.due_evaluations(p_limit integer, p_task uuid default null)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select e.submission_id
  from public.evaluations e
  join public.submissions s on s.id = e.submission_id
  where e.status = 'pending'
    and e.next_attempt_at <= now()
    and (e.locked_until is null or e.locked_until < now())
    and (p_task is null or s.task_id = p_task)
    and not exists (select 1 from public.evaluator_state p where p.paused_until > now())
  order by e.next_attempt_at
  limit greatest(1, least(p_limit, 50))
$$;

-- The Learner's own name, roll, email and phone, so the server can take them
-- out of the work before the AI reads it (BRIEF.md, rule 6).
create function public.submission_personal_terms(p_submission uuid) returns text[]
language sql stable security definer set search_path = ''
as $$
  select array_remove(array[m.name, m.roll, m.email, m.phone], null)
  from public.submissions s
  join public.members m on m.id = s.member_id
  where s.id = p_submission
$$;

revoke execute on function
  public.claim_evaluation(uuid),
  public.due_evaluations(integer, uuid),
  public.submission_personal_terms(uuid)
from public, anon, authenticated;

grant execute on function
  public.claim_evaluation(uuid),
  public.due_evaluations(integer, uuid),
  public.submission_personal_terms(uuid)
to service_role;
