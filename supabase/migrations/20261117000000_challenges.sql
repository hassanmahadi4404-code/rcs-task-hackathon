-- Task platform: a Learner challenges the AI's score.
--
-- "The AI is a first reader, not the last word. A Mentor who disagrees can
-- say so." This is the other half: a Learner who disagrees can say so too,
-- and it reaches the Mentor. A challenge changes no score. It marks the
-- Evaluation for a person to look at, with the Learner's reason, and it is
-- answered when a Mentor or Officer has their say (`set_evaluation_override`).

alter table public.evaluations
  add column challenged_at timestamptz,
  -- Why the Learner thinks the score is wrong, in their own words.
  add column challenge_note text check (challenge_note is null or char_length(challenge_note) between 1 and 1000),
  add constraint evaluations_challenge_has_reason check ((challenged_at is null) = (challenge_note is null));

-- Only the Learner whose work it is, only on their latest attempt, only once,
-- and only while the AI's score is what stands: not before the AI has read
-- it, and not after a Mentor has already had their say.
create function public.challenge_evaluation(p_submission uuid, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(btrim(p_note), '');
  v_member uuid := public.viewer_member_id();
  v_found record;
begin
  select
    s.member_id, e.status, e.challenged_at,
    e.override_score is not null or e.override_note is not null as answered,
    not exists (
      select 1 from public.submissions newer
      where newer.task_id = s.task_id and newer.member_id = s.member_id
        and (newer.created_at, newer.id) > (s.created_at, s.id)
    ) as latest
  into v_found
  from public.submissions s
  join public.evaluations e on e.submission_id = s.id
  where s.id = p_submission;

  -- The same refusal for "not yours" and "does not exist".
  if not found or v_member is null or v_found.member_id is distinct from v_member then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_found.status <> 'done' then
    raise exception 'not_read_yet';
  end if;
  if v_found.answered then
    raise exception 'already_answered';
  end if;
  if v_found.challenged_at is not null then
    raise exception 'already_challenged';
  end if;
  if not v_found.latest then
    raise exception 'not_latest';
  end if;
  if v_note is null then
    raise exception 'reason_missing';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'reason_too_long';
  end if;

  update public.evaluations
  set challenged_at = now(), challenge_note = v_note
  where submission_id = p_submission;
end
$$;

revoke execute on function public.challenge_evaluation(uuid, text) from public, anon;
grant execute on function public.challenge_evaluation(uuid, text) to authenticated, service_role;
