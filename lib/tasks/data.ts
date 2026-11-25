/**
 * Everything the task platform reads, as the signed-in person.
 *
 * Each function asks through `supabaseServer()`, so RLS decides what comes
 * back; nothing here is a permission check. What these add on top is
 * relevance: a Mentor who is also a Member may read every Session as a
 * Member, but the Mentor area only shows the ones they mentor.
 *
 * Server only.
 */

import { cache } from 'react';

import { supabaseServer, type Viewer } from '@/lib/auth';
import type { BoardRow } from '@/lib/tasks/leaderboard';
import { planOrder } from '@/lib/tasks/mentor';
import type { EvaluationRow, SessionRow, SubmissionRow, Submitter, TaskRow, TrackRow } from '@/lib/tasks/types';

const TRACK = 'id, name, description, archived, position';
const SESSION = 'id, track_id, title, held_on, topic, position, date_tbc';
const TASK = 'id, session_id, title, instructions, grading_criteria, deadline, formats, published_at';
const EVALUATION =
  'submission_id, status, ai_score, ai_feedback, model, override_score, override_note, overridden_by, overridden_at, updated_at, attempts, next_attempt_at, failure_reason, flagged';
const SUBMISSION = `id, task_id, member_id, body, file_path, file_size, created_at, evaluation:evaluations(${EVALUATION})`;

/** PostgREST returns a to-one join as an object or a one-item list, by how it reads the key. */
const one = <T>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));

type Joined<T, K extends keyof T> = Omit<T, K> & { [P in K]: unknown };

/** A Session out of a join, without what was joined to it. */
function sessionRow(row: SessionRow): SessionRow {
  const { id, track_id, title, held_on, topic, position, date_tbc } = row;
  return { id, track_id, title, held_on, topic, position, date_tbc };
}

function submission(row: Joined<SubmissionRow, 'evaluation'>): SubmissionRow {
  return { ...row, evaluation: one(row.evaluation as EvaluationRow | EvaluationRow[] | null) };
}

// ---------------------------------------------------------------------------
// Who the viewer is to the task platform
// ---------------------------------------------------------------------------

/** The Sessions this person was named a Mentor of. */
export const mentoredSessionIds = cache(async (email: string): Promise<string[]> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('session_mentors').select('session_id').eq('email', email);
  return (data ?? []).map((row) => row.session_id as string);
});

export interface MentorScope {
  isOfficer: boolean;
  /** The Sessions they mentor; an Officer's scope is every Session regardless. */
  sessionIds: string[];
}

export async function mentorScope(viewer: Viewer): Promise<MentorScope> {
  return { isOfficer: viewer.isOfficer, sessionIds: await mentoredSessionIds(viewer.email) };
}

export function inScope(scope: MentorScope, sessionId: string): boolean {
  return scope.isOfficer || scope.sessionIds.includes(sessionId);
}

// ---------------------------------------------------------------------------
// Learner area
// ---------------------------------------------------------------------------

export interface LearnerTask {
  task: TaskRow;
  session: SessionRow;
  track: TrackRow;
  /** The Learner's own attempts, newest first. */
  submissions: SubmissionRow[];
}

interface TaskJoin extends TaskRow {
  session: (SessionRow & { track: TrackRow | TrackRow[] }) | (SessionRow & { track: TrackRow | TrackRow[] })[];
  submissions: Joined<SubmissionRow, 'evaluation'>[];
}

function learnerTask(row: TaskJoin): LearnerTask | null {
  const session = one(row.session);
  const track = session ? one(session.track) : null;
  if (!session || !track) return null;
  const { session: _session, submissions, ...task } = row;
  return {
    task,
    session: sessionRow(session),
    track,
    submissions: submissions
      .map(submission)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
  };
}

const LEARNER_TASK = `${TASK}, session:sessions(${SESSION}, track:tracks(${TRACK})), submissions(${SUBMISSION})`;

/**
 * Every Task this Member can hand work in to or has: published ones, and ones
 * they submitted to before it was unpublished. Tasks of Sessions they mentor
 * are left out; those are theirs to review, not to do.
 */
export async function learnerTasks(viewer: Viewer & { memberId: string }): Promise<LearnerTask[]> {
  const supabase = await supabaseServer();
  const [{ data }, mentored] = await Promise.all([
    supabase.from('tasks').select(LEARNER_TASK).eq('submissions.member_id', viewer.memberId),
    mentoredSessionIds(viewer.email),
  ]);
  const now = Date.now();
  return ((data ?? []) as unknown as TaskJoin[])
    .map(learnerTask)
    .filter((item): item is LearnerTask => item !== null)
    .filter(({ task, submissions }) => !mentored.includes(task.session_id) && (isPublished(task, now) || submissions.length > 0));
}

export function isPublished(task: Pick<TaskRow, 'published_at'>, now: number): boolean {
  return task.published_at !== null && Date.parse(task.published_at) <= now;
}

/** One Task for a Learner, with whether they mentor its Session; null when it is not theirs to see. */
export async function learnerTaskById(
  viewer: Viewer & { memberId: string },
  taskId: string,
): Promise<(LearnerTask & { mentored: boolean }) | null> {
  const supabase = await supabaseServer();
  const [{ data }, mentored] = await Promise.all([
    supabase.from('tasks').select(LEARNER_TASK).eq('id', taskId).eq('submissions.member_id', viewer.memberId).maybeSingle(),
    mentoredSessionIds(viewer.email),
  ]);
  const item = data ? learnerTask(data as unknown as TaskJoin) : null;
  if (!item) return null;
  if (!isPublished(item.task, Date.now()) && item.submissions.length === 0) return null;
  return { ...item, mentored: mentored.includes(item.task.session_id) };
}

/** A Submission the viewer may read, with only what a download needs. */
export async function submissionFile(submissionId: string): Promise<{ file_path: string | null; task_id: string } | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('submissions').select('file_path, task_id').eq('id', submissionId).maybeSingle();
  return data as { file_path: string | null; task_id: string } | null;
}

// ---------------------------------------------------------------------------
// Mentor area
// ---------------------------------------------------------------------------

/** A Submission, as much as a count or a pill needs. */
export type SubmissionGlance = Pick<SubmissionRow, 'id' | 'task_id' | 'member_id' | 'created_at' | 'evaluation'>;

const GLANCE = 'id, task_id, member_id, created_at, evaluation:evaluations(status, ai_score, override_score, override_note, flagged)';

export interface SessionItem {
  session: SessionRow;
  track: TrackRow;
  tasks: TaskRow[];
  mentors: string[];
  submissions: SubmissionGlance[];
}

interface SessionJoin extends SessionRow {
  track: TrackRow | TrackRow[];
  tasks: TaskRow[];
  session_mentors: { email: string }[];
}

async function sessionItems(scope: MentorScope, sessionId?: string): Promise<SessionItem[]> {
  if (!scope.isOfficer && scope.sessionIds.length === 0) return [];
  const supabase = await supabaseServer();
  let query = supabase
    .from('sessions')
    .select(`${SESSION}, track:tracks(${TRACK}), tasks(${TASK}), session_mentors(email)`)
    .order('held_on');
  if (sessionId) query = query.eq('id', sessionId);
  else if (!scope.isOfficer) query = query.in('id', scope.sessionIds);
  const { data } = await query;
  const rows = ((data ?? []) as unknown as SessionJoin[]).filter((row) => inScope(scope, row.id));

  const taskIds = rows.flatMap((row) => row.tasks.map((task) => task.id));
  const glances =
    taskIds.length > 0
      ? (((await supabase.from('submissions').select(GLANCE).in('task_id', taskIds)).data ?? []) as unknown as Joined<
          SubmissionGlance,
          'evaluation'
        >[])
      : [];
  const submissions = glances.map((row) => ({ ...row, evaluation: one(row.evaluation as EvaluationRow | EvaluationRow[] | null) }));

  // Placed Sessions in their order, then the unplaced by date (the query's order).
  return [...rows].sort(planOrder).flatMap((row) => {
    const track = one(row.track);
    if (!track) return [];
    const { tasks, session_mentors } = row;
    const ids = tasks.map((task) => task.id);
    return [
      {
        session: sessionRow(row),
        track,
        tasks: [...tasks].sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline)),
        mentors: session_mentors.map((mentor) => mentor.email).sort(),
        submissions: submissions.filter((item) => ids.includes(item.task_id)),
      },
    ];
  });
}

/** The Sessions in this person's scope, in the order they are taught, each with its Tasks and a glance at the work. */
export function mentorSessions(scope: MentorScope): Promise<SessionItem[]> {
  return sessionItems(scope);
}

export async function mentorSession(scope: MentorScope, sessionId: string): Promise<SessionItem | null> {
  return (await sessionItems(scope, sessionId))[0] ?? null;
}

export interface TaskContext {
  task: TaskRow;
  session: SessionRow;
  track: TrackRow;
  /** Every deadline in the Session: the Mentor's window turns on the last one. */
  deadlines: string[];
}

interface TaskContextJoin extends TaskRow {
  session: (SessionRow & { track: TrackRow | TrackRow[]; tasks: { deadline: string }[] }) | null;
}

/** A Task with its Session and Track; null outside this person's scope. */
export async function taskContext(scope: MentorScope, taskId: string): Promise<TaskContext | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('tasks')
    .select(`${TASK}, session:sessions(${SESSION}, track:tracks(${TRACK}), tasks(deadline))`)
    .eq('id', taskId)
    .maybeSingle();
  const row = data as unknown as TaskContextJoin | null;
  const joined = row ? one(row.session) : null;
  const track = joined ? one(joined.track) : null;
  if (!row || !joined || !track || !inScope(scope, joined.id)) return null;
  const { session: _session, ...task } = row;
  return {
    task,
    session: sessionRow(joined),
    track,
    deadlines: joined.tasks.map((item) => item.deadline),
  };
}

export interface TaskWork extends TaskContext {
  submissions: SubmissionRow[];
  submitters: Submitter[];
}

/** A Task, every Submission to it, and the names of who handed them in. */
export async function mentorTask(scope: MentorScope, taskId: string): Promise<TaskWork | null> {
  const context = await taskContext(scope, taskId);
  if (!context) return null;
  const supabase = await supabaseServer();
  const [submissions, submitters] = await Promise.all([
    supabase.from('submissions').select(SUBMISSION).eq('task_id', taskId).order('created_at', { ascending: false }),
    supabase.rpc('task_submitters', { p_task: taskId }),
  ]);
  return {
    ...context,
    submissions: ((submissions.data ?? []) as unknown as Joined<SubmissionRow, 'evaluation'>[]).map(submission),
    submitters: (submitters.data ?? []) as Submitter[],
  };
}

export interface SubmissionWork extends TaskContext {
  submission: SubmissionRow;
  submitter: Submitter | null;
  /** Every attempt this Learner made at the Task, oldest first. */
  attempts: SubmissionRow[];
}

export async function mentorSubmission(scope: MentorScope, submissionId: string): Promise<SubmissionWork | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('submissions').select('task_id, member_id').eq('id', submissionId).maybeSingle();
  if (!data) return null;
  const work = await mentorTask(scope, data.task_id as string);
  if (!work) return null;
  const attempts = work.submissions
    .filter((item) => item.member_id === data.member_id)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const found = attempts.find((item) => item.id === submissionId);
  if (!found) return null;
  return {
    task: work.task,
    session: work.session,
    track: work.track,
    deadlines: work.deadlines,
    submission: found,
    submitter: work.submitters.find((person) => person.member_id === data.member_id) ?? null,
    attempts,
  };
}

export interface TrackItem extends TrackRow {
  sessions: number;
}

/** Every Track the viewer may read, in the order they are taught, with how many Sessions it has. */
export async function tracks(): Promise<TrackItem[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('tracks').select(`${TRACK}, sessions(id)`).order('name');
  return ((data ?? []) as unknown as (TrackRow & { sessions: { id: string }[] })[])
    .map(({ sessions, ...track }) => ({ ...track, sessions: sessions.length }))
    .sort(planOrder);
}

export async function trackById(trackId: string): Promise<TrackRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('tracks').select(TRACK).eq('id', trackId).maybeSingle();
  return data as TrackRow | null;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/** Names and totals from `public.leaderboard()`; empty for anyone it is not for. */
export async function leaderboardRows(trackId: string | null): Promise<BoardRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc('leaderboard', { p_track: trackId });
  return (data ?? []) as BoardRow[];
}
