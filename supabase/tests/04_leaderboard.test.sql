-- The leaderboard: names and totals for the people who are part of this,
-- nothing for anyone else, and never a way to read another Learner's work.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

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
create function tests.track(p_name text) returns uuid
language sql security definer set search_path = ''
as $$ select id from public.tracks where name = p_name $$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- Not part of this: nothing.
set local role anon;
select throws_ok('select * from public.leaderboard()', '42501', null, 'signed out: cannot ask');
reset role;
select set_config('request.jwt.claims', tests.claims('outsider@kit.test'), true);
set local role authenticated;
select is_empty('select * from public.leaderboard()', 'outsider: an empty leaderboard');
reset role;

-- A Learner: everyone's name and totals, their own row marked.
select set_config('request.jwt.claims', tests.claims('learner2@kit.test'), true);
set local role authenticated;
select results_eq(
  'select name, points, tasks, is_viewer from public.leaderboard()',
  $$values ('Ayesha Rahman', 82, 1, false), ('Tanvir Hasan', 41, 1, true)$$,
  'Learner: names and totals, best first, their own row marked'
);
select is_empty(
  $$select * from public.leaderboard(tests.track('CP'))$$,
  'Learner: a Track nobody has scored in is empty'
);
select is((select count(*) from public.submissions), 1::bigint, 'Learner: still reads only their own Submission');
select is((select count(*) from public.evaluations), 1::bigint, 'Learner: still reads only their own Evaluation');
select is_empty('select 1 from public.members', 'Learner: still cannot read the Member list');
reset role;

-- A Mentor who is not a Member, and an Officer: the same table, no row of their own.
select set_config('request.jwt.claims', tests.claims('mentor@kit.test'), true);
set local role authenticated;
select is((select count(*) from public.leaderboard() where not is_viewer), 2::bigint, 'Mentor: sees the leaderboard');
reset role;

-- A Mentor's score stands over the AI's.
select set_config('request.jwt.claims', tests.claims('super@kit.test'), true);
set local role authenticated;
select lives_ok(
  $$select public.set_evaluation_override(
      (select s.id from public.submissions s where s.member_id = tests.member('learner2@kit.test')), 90, null)$$,
  'Officer: overrides a score'
);
select results_eq(
  'select name, points from public.leaderboard()',
  $$values ('Tanvir Hasan', 90), ('Ayesha Rahman', 82)$$,
  'the override is what counts'
);
reset role;

-- The latest attempt counts, and an attempt nobody has scored counts for nothing yet.
select set_config('request.jwt.claims', tests.claims('learner1@kit.test'), true);
set local role authenticated;
insert into public.submissions (task_id, member_id, body)
values (tests.task('A to-do list'), tests.member('learner1@kit.test'), 'Not read yet.');
select results_eq(
  'select name, points, tasks from public.leaderboard()',
  $$values ('Tanvir Hasan', 90, 1), ('Ayesha Rahman', 82, 1)$$,
  'a waiting attempt at another Task adds nothing until it is scored'
);
reset role;

select * from finish();
rollback;
