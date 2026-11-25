-- The queue for the AI: oldest first, at a pace, with a newer attempt taking
-- the place of an older one, and a Learner able to see only how long the
-- line in front of them is.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

create schema tests;
create function tests.claims(p_email text) returns text
language sql security definer set search_path = ''
as $$
  select json_build_object('sub', id, 'email', email, 'role', 'authenticated')::text
  from auth.users where email = p_email
$$;
create function tests.task(p_title text) returns uuid
language sql security definer set search_path = ''
as $$ select id from public.tasks where title = p_title $$;
create function tests.member(p_email text) returns uuid
language sql security definer set search_path = ''
as $$ select id from public.members where email = p_email $$;
-- A person's Submissions to a Task, oldest first; `p_nth` picks one.
create function tests.attempt(p_email text, p_task text, p_nth integer) returns uuid
language sql security definer set search_path = ''
as $$
  select s.id from public.submissions s
  where s.member_id = (select id from public.members where email = p_email)
    and s.task_id = (select id from public.tasks where title = p_task)
  order by s.created_at, s.id offset p_nth - 1 limit 1
$$;
create function tests.reason(p_submission uuid) returns text
language sql security definer set search_path = ''
as $$ select status || ':' || coalesce(failure_reason, '-') from public.evaluations where submission_id = p_submission $$;
-- Hand in as a Learner, a moment after the last one, so the order is certain.
create function tests.hand_in(p_email text, p_task text, p_body text, p_seconds integer) returns void
language sql security definer set search_path = ''
as $$
  insert into public.submissions (task_id, member_id, body, created_at)
  select t.id, m.id, p_body, now() + make_interval(secs => p_seconds)
  from public.tasks t, public.members m where t.title = p_task and m.email = p_email
$$;
grant usage on schema tests to anon, authenticated, service_role;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Three Learners hand in, in this order.
select tests.hand_in('learner1@kit.test', 'A to-do list', 'first', 1);
select tests.hand_in('learner2@kit.test', 'A to-do list', 'second', 2);
select tests.hand_in('learner3@kit.test', 'Two sum, faster', 'third', 3);
-- The hand-in above is dated a few seconds ahead; let the line see it as waiting now.
update public.evaluations set next_attempt_at = now() - interval '1 minute' where status = 'pending';

-- A Learner sees how long the line in front of them is, and nothing else.
select set_config('request.jwt.claims', tests.claims('learner3@kit.test'), true);
set local role authenticated;
select is(
  (select ahead from public.evaluation_queue(tests.attempt('learner3@kit.test', 'Two sum, faster', 1))), 2,
  'Learner: two are ahead of them'
);
select is_empty(
  $$select * from public.evaluation_queue(tests.attempt('learner1@kit.test', 'A to-do list', 1))$$,
  'Learner: cannot ask about another Learner''s place'
);
select throws_ok('select public.claim_next_evaluation(0)', '42501', null, 'Learner: cannot move the line themselves');
select throws_ok(
  'update public.evaluator_state set next_slot_at = now()', '42501', null,
  'Learner: cannot touch the pace'
);
reset role;

-- The server takes the oldest first, and only one per slot.
set local role service_role;
select is(
  public.claim_next_evaluation(60000), tests.attempt('learner1@kit.test', 'A to-do list', 1),
  'server: takes the oldest waiting Evaluation'
);
select is(public.claim_next_evaluation(60000), null, 'server: nothing more until the next slot');
reset role;

-- The slot comes round.
update public.evaluator_state set next_slot_at = now() - interval '1 second';
set local role service_role;
select is(
  public.claim_next_evaluation(60000, tests.task('Two sum, faster')), tests.attempt('learner3@kit.test', 'Two sum, faster', 1),
  'server: kept to one Task, takes that Task''s oldest'
);
reset role;

update public.evaluator_state set next_slot_at = now() - interval '1 second';
set local role service_role;
select is(
  public.claim_next_evaluation(0), tests.attempt('learner2@kit.test', 'A to-do list', 1),
  'server: then the next oldest, skipping the ones already being read'
);
select is(public.claim_next_evaluation(0), null, 'server: an empty line gives nothing');
reset role;

-- The rest is the server's and the database's own doing: nobody is signed in.
select set_config('request.jwt.claims', '', true);

-- While the model is out of quota, the line does not move.
select tests.hand_in('learner4@kit.test', 'A to-do list', 'fourth', 4);
update public.evaluations set next_attempt_at = now() - interval '1 minute' where status = 'pending' and attempts = 0;
update public.evaluator_state set paused_until = now() + interval '5 minutes', next_slot_at = now() - interval '1 second';
set local role service_role;
select is(public.claim_next_evaluation(0), null, 'server: nothing is taken while the evaluator is paused');
reset role;
update public.evaluator_state set paused_until = null;

-- A newer attempt takes the place of an older one nobody has read.
select tests.hand_in('learner4@kit.test', 'A to-do list', 'fourth, improved', 5);
select is(
  tests.reason(tests.attempt('learner4@kit.test', 'A to-do list', 1)), 'failed:superseded',
  'an unread older attempt stops waiting when a newer one arrives'
);
select is(
  tests.reason(tests.attempt('learner4@kit.test', 'A to-do list', 2)), 'pending:-',
  'the newer attempt waits in its place'
);
select is(
  tests.reason(tests.attempt('learner1@kit.test', 'A to-do list', 1)), 'pending:-',
  'an attempt that is being read is left to finish'
);
-- Someone else's attempt, and the same Learner's at another Task, are untouched.
select tests.hand_in('learner4@kit.test', 'Two sum, faster', 'another Task', 6);
select is(
  tests.reason(tests.attempt('learner4@kit.test', 'A to-do list', 2)), 'pending:-',
  'an attempt at another Task replaces nothing'
);
select is(
  (select count(*) from public.evaluations where failure_reason = 'superseded'), 1::bigint,
  'only that one attempt was set aside'
);

select * from finish();
rollback;
