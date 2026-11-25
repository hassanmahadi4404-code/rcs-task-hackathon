-- Handing work in, the Evaluation that follows, the Mentor's word, and files:
-- every rule the database enforces, tried with the public key's two roles.
begin;
create extension if not exists pgtap with schema extensions;
select plan(43);

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
create function tests.session(p_title text) returns uuid
language sql security definer set search_path = ''
as $$ select id from public.sessions where title like p_title || '%' $$;
create function tests.member(p_email text) returns uuid
language sql security definer set search_path = ''
as $$ select id from public.members where email = p_email $$;
-- A person's Submission to a Task, newest first.
create function tests.submission(p_email text, p_task text) returns uuid
language sql security definer set search_path = ''
as $$
  select s.id from public.submissions s
  where s.member_id = (select id from public.members where email = p_email)
    and s.task_id = (select id from public.tasks where title = p_task)
  order by s.created_at desc, s.id limit 1
$$;
create function tests.evaluation(p_submission uuid) returns public.evaluations
language sql security definer set search_path = ''
as $$ select e from public.evaluations e where e.submission_id = p_submission $$;
grant usage on schema tests to anon, authenticated, service_role;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- A Learner hands work in ---------------------------------------------------------
select set_config('request.jwt.claims', tests.claims('learner1@kit.test'), true);
set local role authenticated;

select lives_ok(
  $$insert into public.submissions (task_id, member_id, body, client_key, created_at)
    values (tests.task('A to-do list'), tests.member('learner1@kit.test'), '  My list works.  ',
            '11111111-1111-4111-8111-111111111111', now() - interval '30 days')$$,
  'Learner: hands in a text answer to an open Task'
);
select is(
  (select body from public.submissions where id = tests.submission('learner1@kit.test', 'A to-do list')),
  'My list works.', 'the answer is trimmed'
);
select ok(
  (select created_at > now() - interval '1 minute' from public.submissions
   where id = tests.submission('learner1@kit.test', 'A to-do list')),
  'nobody chooses when their work arrived: created_at is the server''s clock'
);
select is(
  (select status from public.evaluations where submission_id = tests.submission('learner1@kit.test', 'A to-do list')),
  'pending', 'an Evaluation exists, pending, from the moment the Submission is saved'
);
select throws_ok(
  $$insert into public.submissions (task_id, member_id, body, client_key)
    values (tests.task('A to-do list'), tests.member('learner1@kit.test'), 'again',
            '11111111-1111-4111-8111-111111111111')$$,
  '23505', null, 'the same attempt sent twice is saved once'
);
select throws_ok(
  $$insert into public.submissions (task_id, member_id, body)
    values (tests.task('A to-do list'), tests.member('learner2@kit.test'), 'not mine')$$,
  '42501', 'not_a_member', 'Learner: cannot hand in as somebody else'
);
select throws_ok(
  $$insert into public.submissions (task_id, member_id, body)
    values (tests.task('A personal profile page'), tests.member('learner1@kit.test'), 'too late')$$,
  '42501', 'task_closed', 'Learner: not after the late window has closed'
);
select throws_ok(
  $$insert into public.submissions (task_id, member_id, body)
    values (tests.task('A to-do list'), tests.member('learner1@kit.test'), '   ')$$,
  'P0001', 'empty_submission', 'Learner: not nothing'
);
select throws_ok(
  $$insert into public.submissions (task_id, member_id, file_path)
    values (tests.task('Two sum, faster'), tests.member('learner1@kit.test'), 'x/y/z.txt')$$,
  'P0001', 'file_not_accepted', 'Learner: not a file where the Task takes text only'
);
select throws_ok(
  $$insert into public.submissions (task_id, member_id, file_path)
    values (tests.task('A to-do list'), tests.member('learner1@kit.test'),
            tests.task('A to-do list') || '/' || tests.member('learner2@kit.test') || '/k/a.txt')$$,
  'P0001', 'file_missing', 'Learner: not a file from another Learner''s folder'
);

-- What is saved cannot be changed, by its owner or anyone.
select is_empty(
  $$update public.submissions set body = 'edited' where member_id = tests.member('learner1@kit.test') returning id$$,
  'Learner: cannot edit a Submission'
);
select is_empty(
  $$delete from public.submissions where member_id = tests.member('learner1@kit.test') returning id$$,
  'Learner: cannot delete a Submission'
);
select is_empty(
  $$update public.evaluations set status = 'done', ai_score = 100, ai_feedback = 'perfect' returning submission_id$$,
  'Learner: cannot write their own Evaluation'
);
select throws_ok(
  $$insert into public.evaluations (submission_id, status, ai_score, ai_feedback)
    values (tests.submission('learner1@kit.test', 'A to-do list'), 'done', 100, 'perfect')$$,
  '42501', null, 'Learner: cannot add an Evaluation'
);
select throws_ok(
  $$select public.set_evaluation_override(tests.submission('learner1@kit.test', 'A to-do list'), 100, 'well done me')$$,
  '42501', 'not_allowed', 'Learner: cannot speak as a Mentor'
);
select throws_ok(
  $$select public.request_reevaluation(tests.submission('learner1@kit.test', 'A to-do list'))$$,
  '42501', 'not_allowed', 'Learner: cannot ask for another read'
);
select throws_ok(
  $$select public.claim_next_evaluation(0)$$,
  '42501', null, 'Learner: cannot run the server''s side'
);
select throws_ok(
  $$select public.submission_personal_terms(tests.submission('learner1@kit.test', 'A to-do list'))$$,
  '42501', null, 'Learner: cannot read personal terms'
);
select throws_ok('select 1 from public.evaluator_state', '42501', null, 'Learner: cannot read the evaluator''s state');

-- Files: only into your own folder of an open Task.
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('submissions', tests.task('A to-do list') || '/' || tests.member('learner1@kit.test') || '/k/todo.js', auth.uid())$$,
  'Learner: uploads into their own folder of an open Task'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('submissions', tests.task('A to-do list') || '/' || tests.member('learner2@kit.test') || '/k/todo.js', auth.uid())$$,
  '42501', null, 'Learner: not into another Learner''s folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('submissions', tests.task('A personal profile page') || '/' || tests.member('learner1@kit.test') || '/k/late.html', auth.uid())$$,
  '42501', null, 'Learner: not for a closed Task'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner) values ('submissions', 'loose.txt', auth.uid())$$,
  '42501', null, 'Learner: not outside a Task folder'
);
select lives_ok(
  $$insert into public.submissions (task_id, member_id, file_path)
    values (tests.task('A to-do list'), tests.member('learner1@kit.test'),
            tests.task('A to-do list') || '/' || tests.member('learner1@kit.test') || '/k/todo.js')$$,
  'Learner: hands in the file they uploaded'
);
reset role;

-- Another Learner sees none of it.
select set_config('request.jwt.claims', tests.claims('learner2@kit.test'), true);
set local role authenticated;
select is_empty(
  $$select 1 from public.submissions where task_id = tests.task('A to-do list')$$,
  'another Learner: sees none of that work'
);
select is_empty('select 1 from storage.objects', 'another Learner: sees none of those files');
reset role;

-- A Mentor who is also a Member: a Learner everywhere but their own Session.
select set_config('request.jwt.claims', tests.claims('mentor-member@kit.test'), true);
set local role authenticated;
select lives_ok(
  $$insert into public.tasks (session_id, title, instructions, grading_criteria, deadline)
    values (tests.session('Web 03'), 'React counter', 'Build a counter.', 'Works: 100', now() + interval '14 days')$$,
  'Mentor and Member: sets the first Task of a Session that has none'
);
select throws_ok(
  $$insert into public.submissions (task_id, member_id, body)
    values (tests.task('React counter'), tests.member('mentor-member@kit.test'), 'my own')$$,
  '42501', 'own_session', 'Mentor and Member: cannot hand in to a Session they mentor'
);
select lives_ok(
  $$insert into public.submissions (task_id, member_id, body)
    values (tests.task('A to-do list'), tests.member('mentor-member@kit.test'), 'as a Learner')$$,
  'Mentor and Member: hands in elsewhere like any Learner'
);
select is(
  (select count(*) from public.submissions), 1::bigint,
  'Mentor and Member: still sees only their own work there'
);
reset role;

-- The Session's Mentor: reads it all, and has a say while the window is open -------
select set_config('request.jwt.claims', tests.claims('mentor@kit.test'), true);
set local role authenticated;
select is(
  (select count(*) from public.submissions where task_id = tests.task('A to-do list')), 3::bigint,
  'Mentor: reads every Submission to their Task'
);
select is((select count(*) from storage.objects), 1::bigint, 'Mentor: reads their Session''s files');
select is_empty(
  $$update public.evaluations set ai_score = 0 returning submission_id$$,
  'Mentor: cannot rewrite the AI''s half'
);
select lives_ok(
  $$select public.set_evaluation_override(tests.submission('learner1@kit.test', 'A to-do list'), 75, '  Good, but test on a phone.  ')$$,
  'Mentor: overrides an Evaluation in an open window'
);
select throws_ok(
  $$select public.set_evaluation_override(tests.submission('learner1@kit.test', 'A to-do list'), 101, null)$$,
  'P0001', 'score_out_of_range', 'Mentor: a score is 0 to 100'
);
select throws_ok(
  $$select public.set_evaluation_override(tests.submission('learner1@kit.test', 'A to-do list'), null, '  ')$$,
  'P0001', 'override_empty', 'Mentor: an override says something'
);
select throws_ok(
  $$select public.set_evaluation_override(tests.submission('learner1@kit.test', 'A personal profile page'), 90, 'late thoughts')$$,
  '42501', 'not_allowed', 'Mentor: no say once the window has closed'
);
select is_empty(
  $$delete from public.tasks where id = tests.task('A to-do list') returning id$$,
  'Mentor: cannot delete a Task Learners handed work in to'
);
select is_empty(
  $$delete from public.submissions returning id$$,
  'Mentor: cannot delete a Submission'
);
reset role;

select is(
  (select row(e.override_score, e.override_note, e.overridden_by)::text
   from tests.evaluation(tests.submission('learner1@kit.test', 'A to-do list')) e),
  '(75,"Good, but test on a phone.",mentor@kit.test)',
  'the override records the score, the note and who said it'
);

-- An Officer steps in anywhere --------------------------------------------------------
select set_config('request.jwt.claims', tests.claims('super@kit.test'), true);
set local role authenticated;
select lives_ok(
  $$select public.set_evaluation_override(tests.submission('learner1@kit.test', 'A personal profile page'), 90, null)$$,
  'Officer: overrides after the Mentor''s window has closed'
);
select lives_ok(
  $$select public.clear_evaluation_override(tests.submission('learner1@kit.test', 'A personal profile page'))$$,
  'Officer: takes an override back'
);
select throws_ok(
  $$insert into public.submissions (task_id, member_id, body)
    values (tests.task('A to-do list'), tests.member('learner1@kit.test'), 'for them')$$,
  '42501', 'not_a_member', 'Officer: cannot hand in for a Learner'
);
reset role;

select * from finish();
rollback;
