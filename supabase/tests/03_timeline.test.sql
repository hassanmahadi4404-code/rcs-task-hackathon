-- The Session timeline: a Session planned without a date can still be given
-- its first Task by its Mentor, and the plan's columns are not a way around
-- who may change a Session.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

create schema tests;
create function tests.claims(p_email text) returns text
language sql security definer set search_path = ''
as $$
  select json_build_object('sub', id, 'email', email, 'role', 'authenticated')::text
  from auth.users where email = p_email
$$;
create function tests.session(p_title text) returns uuid
language sql security definer set search_path = ''
as $$ select id from public.sessions where title = p_title $$;
grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;

-- An Officer plans a Session long ago in the calendar, with no date settled.
select set_config('request.jwt.claims', tests.claims('super@kit.test'), true);
set local role authenticated;
select lives_ok(
  $$insert into public.sessions (track_id, title, topic, position, held_on, date_tbc)
    select id, 'S9', 'Planned, not dated', 9, date '2020-01-01', true from public.tracks where name = 'CP'$$,
  'Officer: plans a Session with no date settled'
);
select lives_ok(
  $$insert into public.session_mentors (session_id, email) values (tests.session('S9'), 'mentor@kit.test')$$,
  'Officer: names its Mentor'
);
reset role;

select is(
  public.session_edit_until(tests.session('S9')), 'infinity'::timestamptz,
  'a Session with no date and no Task has not started to close'
);

select set_config('request.jwt.claims', tests.claims('mentor@kit.test'), true);
set local role authenticated;
select lives_ok(
  $$insert into public.tasks (session_id, title, instructions, grading_criteria, deadline)
    values (tests.session('S9'), 'First', 'x', 'x: 100', now() + interval '5 days')$$,
  'Mentor: sets the first Task of a Session that has no date yet'
);
select is_empty(
  $$update public.sessions set topic = 'Mine now', position = 1, date_tbc = false where id = tests.session('S9') returning id$$,
  'Mentor: still cannot change the plan itself'
);
reset role;

select ok(
  public.session_edit_until(tests.session('S9')) < now() + interval '13 days',
  'once it has a Task, the window is a week after that deadline'
);

-- A Track is upcoming, running or finished: never upcoming and finished at once.
select throws_ok(
  $$update public.tracks set upcoming = true, archived = true where name = 'CP'$$,
  '23514', null, 'a Track has one status'
);

select * from finish();
rollback;
