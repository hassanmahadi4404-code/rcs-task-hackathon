-- Freshers · Learning Track v1: 20 Sessions in 7 Tracks, as the society
-- planned them. Optional: `supabase/seed.sql` does not load this, and the
-- tests expect the seed alone. Load it into a local database with
--
--   docker exec -i supabase_db_rcs-task-kit psql -U postgres < supabase/data/freshers-learning-track.sql
--
-- and `npx supabase db reset` takes it out again. Running it twice adds
-- nothing twice.
--
-- It carries the plan only: Track, Session, syllabus, order, and the dates
-- that are settled. Mentors are named by an Officer, by email, on each
-- Session's page; no person's name or number belongs in this file.

insert into public.tracks (name, position) values
  ('Foundations', 1),
  ('Web', 2),
  ('App', 3),
  ('DevOps', 4),
  ('AI/ML', 5),
  ('LLM', 6),
  ('Research', 7)
on conflict (name) do update set position = excluded.position;

insert into public.sessions (track_id, title, topic, position, held_on, date_tbc)
select t.id, p.title, p.topic, p.position, coalesce(p.held_on, current_date), p.held_on is null
from (values
  ('Foundations', 1, 'S1', 'CS career map, how to learn, terminal, how the web works (HTTP, APIs, JSON)', date '2026-11-12'),
  ('Foundations', 2, 'S2', 'Git + GitHub and our real PR workflow: issue → PR → CI → review', date '2026-11-19'),
  ('Foundations', 3, 'S3', 'AI fluency: AI as a tutor (explain, quiz me, compare approaches), prompting with context and examples, coding assistants and agents, checking and testing AI output, hallucinations, keeping secrets out, and our rule: explain every line you submit', null),
  ('Web', 1, 'S1', 'HTML, CSS, JavaScript concepts; browser DevTools', null),
  ('Web', 2, 'S2', 'React + design basics (component libraries, tokens, wireframes)', null),
  ('Web', 3, 'S3', 'Backends and REST: Node vs FastAPI', null),
  ('Web', 4, 'S4', 'Databases (SQL / Postgres), auth, the full request flow', null),
  ('App', 1, 'S1', 'Dart + Flutter, widgets', null),
  ('App', 2, 'S2', 'Layouts, navigation, state', null),
  ('App', 3, 'S3', 'Calling APIs, local storage, building an APK', null),
  ('DevOps', 1, 'S1', 'Docker, environment variables, secrets', null),
  ('DevOps', 2, 'S2', 'CI/CD with GitHub Actions, deploying, monitoring', null),
  ('AI/ML', 1, 'S1', 'Python for data: pandas, EDA', null),
  ('AI/ML', 2, 'S2', 'Classic ML + how to evaluate a model', null),
  ('AI/ML', 3, 'S3', 'Deep learning, transfer learning', null),
  ('AI/ML', 4, 'S4', 'Serving a model with FastAPI, MLOps basics', null),
  ('LLM', 1, 'S1', 'How LLMs work, prompting', null),
  ('LLM', 2, 'S2', 'LLM APIs, tool calling, RAG, agents', null),
  ('Research', 1, 'S1', 'Reading papers, literature review, finding a gap', null),
  ('Research', 2, 'S2', 'Experiment design, baselines, ablations, reproducibility, writing', null)
) as p(track, position, title, topic, held_on)
join public.tracks t on t.name = p.track
where not exists (
  select 1 from public.sessions s where s.track_id = t.id and s.title = p.title
);
