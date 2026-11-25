-- Challenging the AI's score: only the Learner whose work it is, with a
-- reason, once, on their latest attempt, while the AI's score still stands.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create schema tests;
create function tests.claims(p_email text) returns text
language sql security definer set search_path = ''
as $$
  select json_build_object('sub', id, 'email', email, 'role', 'authenticated')::text
  from auth.users where email = p_email
$$;
-- A person's Submission to the seed's finished Task, newest first.
create function tests.work(p_email text) returns uuid
language sql security definer set search_path = ''
as $$
  select s.id from public.submissions s
  where s.member_id = (select id from public.members where email = p_email)
  order by s.created_at desc, s.id limit 1
$$;
create function tests.challenge(p_submission uuid) returns text
language sql security definer set search_path = ''
as $$ select challenge_note from public.evaluations where submission_id = p_submission $$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- The seed: learner1 scored 82 and learner2 41 on "A personal profile page".

-- Who will answer: a Mentor only where there is one and their window is open.
select set_config('request.jwt.claims', tests.claims('learner1@kit.test'), true);
set local role authenticated;
select ok(
  public.task_has_acting_mentor((select id from public.tasks where title = 'A to-do list')),
  'a running Session with a Mentor: the Mentor answers'
);
select ok(
  not public.task_has_acting_mentor((select id from public.tasks where title = 'A personal profile page')),
  'a Session whose Mentor''s window has closed: it falls to an Officer'
);
select ok(
  not public.task_has_acting_mentor((select id from public.tasks where title = 'Two sum, faster')),
  'a Session with no Mentor: it falls to an Officer'
);
reset role;

-- Not the Learner's own: refused, whoever asks.
select set_config('request.jwt.claims', tests.claims('learner2@kit.test'), true);
set local role authenticated;
select throws_ok(
  $$select public.challenge_evaluation(tests.work('learner1@kit.test'), 'Give them less')$$,
  '42501', 'not_allowed', 'Learner: cannot challenge another Learner''s score'
);
select throws_ok(
  $$select public.challenge_evaluation(tests.work('learner2@kit.test'), '   ')$$,
  'P0001', 'reason_missing', 'Learner: a challenge says why'
);
select is_empty(
  $$update public.evaluations set challenged_at = now(), challenge_note = 'direct' returning submission_id$$,
  'Learner: cannot mark a challenge by writing to the table'
);
select lives_ok(
  $$select public.challenge_evaluation(tests.work('learner2@kit.test'), '  I did test it on a phone.  ')$$,
  'Learner: challenges the AI''s score on their own work'
);
select is(
  (select challenge_note from public.evaluations where submission_id = tests.work('learner2@kit.test')),
  'I did test it on a phone.', 'the reason is kept, trimmed'
);
select is(
  (select ai_score from public.evaluations where submission_id = tests.work('learner2@kit.test')), 41,
  'a challenge changes no score'
);
select throws_ok(
  $$select public.challenge_evaluation(tests.work('learner2@kit.test'), 'Again')$$,
  'P0001', 'already_challenged', 'Learner: once per Evaluation'
);
reset role;

-- Everyone else who is not the Learner.
select set_config('request.jwt.claims', tests.claims('mentor@kit.test'), true);
set local role authenticated;
select throws_ok(
  $$select public.challenge_evaluation(tests.work('learner1@kit.test'), 'As a Mentor')$$,
  '42501', 'not_allowed', 'Mentor: cannot challenge for a Learner'
);
select is(
  (select count(*) from public.evaluations where challenged_at is not null), 1::bigint,
  'Mentor: sees which of their Session''s Evaluations were challenged'
);
reset role;
set local role anon;
select throws_ok(
  $$select public.challenge_evaluation(tests.work('learner1@kit.test'), 'Signed out')$$,
  '42501', null, 'signed out: cannot challenge'
);
reset role;

-- Once a Mentor or Officer has had their say, there is nothing left to challenge.
select set_config('request.jwt.claims', tests.claims('super@kit.test'), true);
set local role authenticated;
select lives_ok(
  $$select public.set_evaluation_override(tests.work('learner1@kit.test'), 85, 'Checked by hand.')$$,
  'Officer: has their say on learner1''s work'
);
reset role;
select set_config('request.jwt.claims', tests.claims('learner1@kit.test'), true);
set local role authenticated;
select throws_ok(
  $$select public.challenge_evaluation(tests.work('learner1@kit.test'), 'Still too low')$$,
  'P0001', 'already_answered', 'Learner: not after a person has answered'
);
reset role;

-- Not before the AI has read it, and not on an attempt that is no longer the latest.
select set_config('request.jwt.claims', '', true);
insert into public.submissions (task_id, member_id, body, created_at)
select t.id, m.id, 'Not read yet', now() from public.tasks t, public.members m
where t.title = 'A to-do list' and m.email = 'learner3@kit.test';
select set_config('request.jwt.claims', tests.claims('learner3@kit.test'), true);
set local role authenticated;
select throws_ok(
  $$select public.challenge_evaluation(tests.work('learner3@kit.test'), 'Too slow')$$,
  'P0001', 'not_read_yet', 'Learner: not before the AI has read it'
);
reset role;

select set_config('request.jwt.claims', '', true);
update public.evaluations set status = 'done', ai_score = 10, ai_feedback = 'Thin.'
where submission_id = tests.work('learner3@kit.test');
insert into public.submissions (task_id, member_id, body, created_at)
select t.id, m.id, 'A newer attempt', now() + interval '1 second' from public.tasks t, public.members m
where t.title = 'A to-do list' and m.email = 'learner3@kit.test';
select set_config('request.jwt.claims', tests.claims('learner3@kit.test'), true);
set local role authenticated;
select throws_ok(
  $$select public.challenge_evaluation(
      (select id from public.submissions where body = 'Not read yet'), 'About the old one')$$,
  'P0001', 'not_latest', 'Learner: only the latest attempt, the one that counts'
);
reset role;

-- A reason cannot be stored without a challenge, or a challenge without a reason.
select set_config('request.jwt.claims', '', true);
select throws_ok(
  $$update public.evaluations set challenge_note = 'orphan' where challenged_at is null$$,
  '23514', null, 'a reason belongs to a challenge'
);
select is(tests.challenge(tests.work('learner1@kit.test')), null, 'the refused challenges left nothing behind');

select * from finish();
rollback;
