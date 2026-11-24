-- Who may see and change what, asked the way a judge would: as each seed
-- person, with nothing but their own session. `npm run test:db` runs this
-- against the seeded local database (`npx supabase db reset` first).
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- Helpers: the JWT a seed person signs in with, and the seed's ids by name.
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
create function tests.submission(p_email text) returns uuid
language sql security definer set search_path = ''
as $$
  select s.id from public.submissions s join public.members m on m.id = s.member_id
  where m.email = p_email order by s.created_at limit 1
$$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- Signed out ------------------------------------------------------------------
set local role anon;
select is_empty('select 1 from public.tasks', 'signed out: no Tasks');
select is_empty('select 1 from public.submissions', 'signed out: no Submissions');
select throws_ok('select public.can_read_task(tests.task(''A to-do list''))', '42501', null, 'signed out: the helpers cannot be called');
reset role;

-- Signed in, but nobody: not a Member, a Mentor or an Officer -------------------
select set_config('request.jwt.claims', tests.claims('outsider@kit.test'), true);
set local role authenticated;
select is_empty('select 1 from public.tracks', 'outsider: no Tracks');
select is_empty('select 1 from public.sessions', 'outsider: no Sessions');
select is_empty('select 1 from public.tasks', 'outsider: no Tasks');
select is_empty('select 1 from public.session_mentors', 'outsider: no Mentors');
select is_empty('select 1 from public.submissions', 'outsider: no Submissions');
select is_empty('select 1 from public.evaluations', 'outsider: no Evaluations');
select is_empty('select 1 from public.members', 'outsider: no Members');
select is_empty('select 1 from storage.objects', 'outsider: no files');
reset role;

-- A Learner -------------------------------------------------------------------
select set_config('request.jwt.claims', tests.claims('learner2@kit.test'), true);
set local role authenticated;
select is((select count(*) from public.tracks), 2::bigint, 'Learner: every Track');
select is((select count(*) from public.sessions), 4::bigint, 'Learner: every Session');
select is((select count(*) from public.tasks), 3::bigint, 'Learner: every published Task');
select is((select count(*) from public.submissions), 1::bigint, 'Learner: only their own Submission');
select is((select count(*) from public.evaluations), 1::bigint, 'Learner: only their own Evaluation');
select is_empty(
  'select 1 from public.submissions where id = tests.submission(''learner1@kit.test'')',
  'Learner: never another Learner''s Submission'
);
select is_empty('select 1 from public.session_mentors', 'Learner: no Mentor''s email');
select is_empty('select 1 from public.members', 'Learner: no Member list');
select is_empty('select * from public.task_submitters(tests.task(''A personal profile page''))', 'Learner: no roster');
select throws_ok(
  'insert into public.tasks (session_id, title, instructions, grading_criteria, deadline)
   values (tests.session(''Web 02''), ''x'', ''x'', ''x'', now())',
  '42501', null, 'Learner: cannot set a Task'
);
select is_empty(
  'update public.tasks set deadline = now() + interval ''30 days'' returning id',
  'Learner: cannot move a deadline'
);
select throws_ok('insert into public.tracks (name) values (''Mine'')', '42501', null, 'Learner: cannot add a Track');
reset role;

-- A draft is the Mentor's until it is published.
update public.tasks set published_at = null where title = 'Two sum, faster';
select set_config('request.jwt.claims', tests.claims('learner2@kit.test'), true);
set local role authenticated;
select is((select count(*) from public.tasks), 2::bigint, 'Learner: a draft Task is not shown');
reset role;
update public.tasks set published_at = now() where title = 'Two sum, faster';

-- A Mentor who is not a Member ---------------------------------------------------
-- mentor@kit.test mentors Web 01 (its window closed three days ago) and Web 02.
select set_config('request.jwt.claims', tests.claims('mentor@kit.test'), true);
set local role authenticated;
select is((select count(*) from public.tracks), 1::bigint, 'Mentor: only the Track they mentor in');
select is((select count(*) from public.sessions), 2::bigint, 'Mentor: only their Sessions');
select is((select count(*) from public.tasks), 2::bigint, 'Mentor: only their Sessions'' Tasks');
select is((select count(*) from public.submissions), 2::bigint, 'Mentor: their Sessions'' Submissions, still, after the window');
select is(
  (select count(*) from public.task_submitters(tests.task('A personal profile page'))), 2::bigint,
  'Mentor: names and rolls of who handed in to their Task'
);
select is_empty('select * from public.task_submitters(tests.task(''Two sum, faster''))', 'Mentor: no roster for another Session');
select lives_ok(
  'insert into public.tasks (session_id, title, instructions, grading_criteria, deadline)
   values (tests.session(''Web 02''), ''Extra'', ''x'', ''x: 100'', now() + interval ''2 days'')',
  'Mentor: sets a Task in a Session whose window is open'
);
select throws_ok(
  'insert into public.tasks (session_id, title, instructions, grading_criteria, deadline)
   values (tests.session(''Web 01''), ''Too late'', ''x'', ''x'', now() + interval ''2 days'')',
  '42501', null, 'Mentor: not once the window has closed, even to reopen it'
);
select throws_ok(
  'insert into public.tasks (session_id, title, instructions, grading_criteria, deadline)
   values (tests.session(''CP 01''), ''Not mine'', ''x'', ''x'', now())',
  '42501', null, 'Mentor: not in a Session they do not mentor'
);
select is_empty('update public.sessions set title = ''Renamed'' returning id', 'Mentor: cannot change a Session');
select throws_ok(
  'insert into public.session_mentors (session_id, email) values (tests.session(''CP 01''), ''mentor@kit.test'')',
  '42501', null, 'Mentor: cannot name themselves a Mentor'
);
select isnt_empty('delete from public.tasks where title = ''Extra'' returning id', 'Mentor: deletes a Task nobody handed in to');
reset role;

-- A Mentor who is also a Member ---------------------------------------------------
-- mentor-member@kit.test mentors Web 03 only.
select set_config('request.jwt.claims', tests.claims('mentor-member@kit.test'), true);
set local role authenticated;
select is_empty('select 1 from public.submissions', 'Mentor and Member: no Submissions from Sessions they do not mentor');
select is((select count(*) from public.session_mentors), 1::bigint, 'Mentor and Member: only their own Session''s Mentors');
reset role;

-- An Officer ------------------------------------------------------------------
select set_config('request.jwt.claims', tests.claims('moderator@kit.test'), true);
set local role authenticated;
select is((select count(*) from public.submissions), 2::bigint, 'Officer: every Submission');
select is((select count(*) from public.session_mentors), 3::bigint, 'Officer: every Mentor');
select lives_ok(
  'insert into public.tasks (session_id, title, instructions, grading_criteria, deadline)
   values (tests.session(''Web 01''), ''Officer steps in'', ''x'', ''x'', now() + interval ''1 day'')',
  'Officer: steps in after a Mentor''s window has closed'
);
select is_empty(
  'delete from public.sessions where id = tests.session(''Web 01'') returning id',
  'Officer: cannot delete a Session Learners handed work in to'
);
reset role;

select * from finish();
rollback;
