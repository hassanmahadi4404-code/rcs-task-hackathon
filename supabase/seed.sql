-- Fictional seed data for the Starter kit. `npx supabase db reset` loads it.
-- Dates are relative to the moment of the reset, so the past, current and
-- future Sessions stay past, current and future.
--
-- Every user's password is: password123
--
--   super@kit.test          Officer (super admin)
--   moderator@kit.test      Officer (moderator)
--   mentor@kit.test         Mentor of "Web 01" (past) and "Web 02" (current); not a Member
--   mentor-member@kit.test  Mentor of "Web 03" (future), and also a Member
--   learner1@kit.test … learner5@kit.test   Members
--   outsider@kit.test       signed in, nothing else
--
-- "CP 01" has no Mentor.

-- Users --------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  email, extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from unnest(array[
  'super@kit.test', 'moderator@kit.test', 'mentor@kit.test', 'mentor-member@kit.test',
  'learner1@kit.test', 'learner2@kit.test', 'learner3@kit.test', 'learner4@kit.test',
  'learner5@kit.test', 'outsider@kit.test'
]) as email;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from auth.users;

insert into public.admins (email, role) values
  ('super@kit.test', 'super_admin'),
  ('moderator@kit.test', 'moderator');

insert into public.members (name, roll, department, series, email, phone) values
  ('Ayesha Rahman', '2203001', 'CSE', '22', 'learner1@kit.test', '01700000001'),
  ('Tanvir Hasan', '2203002', 'CSE', '22', 'learner2@kit.test', '01700000002'),
  ('Nusrat Jahan', '2304003', 'EEE', '23', 'learner3@kit.test', '01700000003'),
  ('Rafiul Islam', '2410004', 'ETE', '24', 'learner4@kit.test', null),
  ('Sadia Afrin', '2403005', 'CSE', '24', 'learner5@kit.test', '01700000005'),
  ('Mahin Chowdhury', '2103006', 'CSE', '21', 'mentor-member@kit.test', '01700000006');

-- Tracks and Sessions ------------------------------------------------------

insert into public.tracks (name, description) values
  ('Web', 'Building for the web, from HTML to full-stack apps.'),
  ('CP', 'Competitive programming: problem solving under time limits.');

insert into public.sessions (track_id, title, held_on)
select t.id, s.title, (now() + s.offset_days * interval '1 day')::date
from (values
  ('Web', 'Web 01: HTML and CSS', -17),
  ('Web', 'Web 02: JavaScript basics', -4),
  ('Web', 'Web 03: React', 10),
  ('CP', 'CP 01: Complexity', -2)
) as s(track, title, offset_days)
join public.tracks t on t.name = s.track;

insert into public.session_mentors (session_id, email)
select id, m.email
from public.sessions
join (values
  ('Web 01: HTML and CSS', 'mentor@kit.test'),
  ('Web 02: JavaScript basics', 'mentor@kit.test'),
  ('Web 03: React', 'mentor-member@kit.test')
) as m(title, email) on m.title = sessions.title;

-- Tasks ----------------------------------------------------------------------

insert into public.tasks (session_id, title, instructions, grading_criteria, deadline, formats)
select s.id, t.title, t.instructions, t.criteria, now() + t.due, t.formats::text[]
from (values
  ('Web 01: HTML and CSS', 'A personal profile page',
   'Build a one-page profile with a heading, a photo, a short bio and a list of links. Use semantic HTML and one stylesheet.',
   'Semantic elements (header, main, section, nav) used correctly: 40. Layout works on a phone: 30. Clean, consistent CSS: 30.',
   interval '-10 days', '{text,file}'),
  ('Web 02: JavaScript basics', 'A to-do list',
   'Write a to-do list in plain JavaScript: add an item, mark it done, delete it. Keep the list after a page reload.',
   'All three actions work: 40. Survives a reload (localStorage): 30. Readable code with no global variables leaking: 30.',
   interval '3 days', '{text,file}'),
  ('CP 01: Complexity', 'Two sum, faster',
   'Given an array of n integers and a target, print the indices of two numbers that add up to the target. n can be 100000.',
   'Correct answer: 40. O(n) or O(n log n) time with an explanation of why: 40. Handles duplicates and no-answer input: 20.',
   interval '5 days', '{text}')
) as t(session, title, instructions, criteria, due, formats)
join public.sessions s on s.title = t.session;

-- Past Session: two Learners submitted and were evaluated ---------------------

with past as (
  select id from public.tasks where title = 'A personal profile page'
), sub as (
  insert into public.submissions (task_id, member_id, body, created_at)
  select past.id, m.id, x.body, now() - interval '12 days'
  from past
  cross join (values
    ('learner1@kit.test', 'I built the page with header, main and two sections. The links are in a nav. I used flexbox for the layout and a media query at 600px.'),
    ('learner2@kit.test', 'My page uses divs for everything and one big CSS file. It looks fine on my laptop.')
  ) as x(email, body)
  join public.members m on m.email = x.email
  returning id, body
)
insert into public.evaluations (submission_id, status, ai_score, ai_feedback, model)
select id, 'done',
  case when body like 'I built%' then 82 else 41 end,
  case when body like 'I built%'
    then 'Good use of semantic elements and a working phone layout. Tighten the CSS: several rules repeat the same colours.'
    else 'The page works, but divs everywhere lose the meaning semantic elements give, and nothing was checked on a phone.'
  end,
  'mock'
from sub;
