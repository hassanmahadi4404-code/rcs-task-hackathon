-- Task platform, part 2 of 3: handing work in. A Submission is written once
-- and never changed: no update or delete policy exists, for anybody. What a
-- Learner hands in is theirs; only they, the Session's Mentors and Officers
-- ever read it.

-- Columns -------------------------------------------------------------------

alter table public.submissions
  -- Made by the form before it is sent, so a retry on a bad connection or a
  -- double click saves the work once, not twice.
  add column client_key uuid,
  -- Read from Storage when the Submission is saved, never taken from the form.
  add column file_size bigint,
  add column file_type text,
  add constraint submissions_body_length check (body is null or char_length(body) between 1 and 50000);

create unique index submissions_member_client_key_idx
  on public.submissions (member_id, client_key)
  where client_key is not null;

-- How many attempts one Learner may make at one Task. Several, as CONTEXT.md
-- says, but each one spends free AI quota.
create function public.max_attempts() returns integer
language sql immutable set search_path = ''
as $$ select 10 $$;

-- Helpers -------------------------------------------------------------------

-- Text that may not be a UUID, from a Storage path.
create function public.try_uuid(p_text text) returns uuid
language plpgsql immutable set search_path = ''
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end
$$;

-- The signed-in Member may hand work in to this Task now: it is published,
-- its late window is open, and they do not mentor its Session.
create function public.task_accepts_submissions(p_task uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.viewer_member_id() is not null and exists (
    select 1 from public.tasks t
    where t.id = p_task
      and t.published_at is not null and t.published_at <= now()
      and now() <= t.deadline + public.late_window()
      and not public.is_session_mentor(t.session_id)
  )
$$;

-- Saving a Submission -------------------------------------------------------
-- The rules live in this trigger, so they hold for the form and for anyone
-- writing to the table with the public key. Each refusal raises its own word,
-- which `content/tasks.ts` turns into a sentence.

create function public.submissions_before_insert() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_member uuid;
  v_task public.tasks;
  v_attempts integer;
  v_size bigint;
  v_type text;
begin
  -- The seed and the server's service role are trusted; they carry no user.
  if auth.uid() is null then
    return new;
  end if;

  v_member := public.viewer_member_id();
  if v_member is null or new.member_id is distinct from v_member then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  select * into v_task from public.tasks where id = new.task_id;
  if not found or v_task.published_at is null or v_task.published_at > now() then
    raise exception 'task_not_found' using errcode = '42501';
  end if;
  if public.is_session_mentor(v_task.session_id) then
    raise exception 'own_session' using errcode = '42501';
  end if;
  if now() > v_task.deadline + public.late_window() then
    raise exception 'task_closed' using errcode = '42501';
  end if;

  -- Lateness is `created_at` against the deadline, so nobody chooses it.
  new.created_at := now();
  new.body := nullif(btrim(new.body), '');

  if new.body is not null and not ('text' = any (v_task.formats)) then
    raise exception 'text_not_accepted';
  end if;
  if new.file_path is not null and not ('file' = any (v_task.formats)) then
    raise exception 'file_not_accepted';
  end if;
  if new.body is null and new.file_path is null then
    raise exception 'empty_submission';
  end if;

  -- A repeat of a saved attempt goes on to the unique index, which answers it.
  if new.client_key is null or not exists (
    select 1 from public.submissions s
    where s.member_id = v_member and s.client_key = new.client_key
  ) then
    select count(*) into v_attempts
    from public.submissions s
    where s.task_id = new.task_id and s.member_id = v_member;
    if v_attempts >= public.max_attempts() then
      raise exception 'too_many_attempts';
    end if;
  end if;

  if new.file_path is null then
    new.file_size := null;
    new.file_type := null;
  else
    -- Only a file this Learner put in their own folder of this Task.
    if new.file_path not like new.task_id::text || '/' || v_member::text || '/%' then
      raise exception 'file_missing';
    end if;
    select (o.metadata ->> 'size')::bigint, o.metadata ->> 'mimetype'
      into v_size, v_type
    from storage.objects o
    where o.bucket_id = 'submissions' and o.name = new.file_path;
    if not found then
      raise exception 'file_missing';
    end if;
    new.file_size := v_size;
    new.file_type := v_type;
  end if;

  return new;
end
$$;

create trigger submissions_before_insert
before insert on public.submissions
for each row execute function public.submissions_before_insert();

-- "The row exists from the moment the Submission is saved, as `pending`."
create function public.submissions_after_insert() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.evaluations (submission_id) values (new.id)
  on conflict (submission_id) do nothing;
  return null;
end
$$;

create trigger submissions_after_insert
after insert on public.submissions
for each row execute function public.submissions_after_insert();

-- Policies ------------------------------------------------------------------

create policy "A Learner reads their own Submissions; Mentors and Officers read their Sessions'"
on public.submissions for select to authenticated
using (member_id = public.viewer_member_id() or public.can_read_task(task_id));

create policy "A Learner hands in their own work to an open Task"
on public.submissions for insert to authenticated
with check (
  member_id = public.viewer_member_id()
  and public.task_accepts_submissions(task_id)
);

-- Files ---------------------------------------------------------------------
-- Object paths are `<task id>/<member id>/<upload id>/<file name>`. The
-- browser uploads straight to Storage with a signed URL, because Vercel
-- refuses request bodies over 4.5 MB; these policies decide who may be given
-- one. The bucket itself caps a file at 10 MB.

create policy "A Learner uploads into their own folder of an open Task"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'submissions'
  and (storage.foldername(name))[2] = public.viewer_member_id()::text
  and public.task_accepts_submissions(public.try_uuid((storage.foldername(name))[1]))
);

create policy "A Learner reads their own files; Mentors and Officers read their Sessions'"
on storage.objects for select to authenticated
using (
  bucket_id = 'submissions'
  and (
    (storage.foldername(name))[2] = public.viewer_member_id()::text
    or public.can_read_task(public.try_uuid((storage.foldername(name))[1]))
  )
);

-- What a Mentor needs to know about who handed work in ------------------------
-- `members` stays deny-all. A Mentor reviewing a Task gets a name and a roll
-- for the Learners who submitted to it, and nothing else about anybody.

create function public.task_submitters(p_task uuid)
returns table (member_id uuid, name text, roll text)
language sql stable security definer set search_path = ''
as $$
  select distinct m.id, m.name, m.roll
  from public.submissions s
  join public.members m on m.id = s.member_id
  where s.task_id = p_task and public.can_read_task(p_task)
$$;

revoke execute on function
  public.try_uuid(text),
  public.task_accepts_submissions(uuid),
  public.task_submitters(uuid),
  public.submissions_before_insert(),
  public.submissions_after_insert()
from public, anon;

grant execute on function
  public.try_uuid(text),
  public.task_accepts_submissions(uuid),
  public.task_submitters(uuid)
to authenticated, service_role;
