/**
 * What a Mentor is shown about the work that came in: each Learner's latest
 * attempt, the state it is in, and the numbers above the list.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import { lateBy, sessionEditUntil, taskPhase, type TaskPhase } from './deadlines.ts';
import { DAY_MS } from './rules.ts';
import type { EvaluationRow, SubmissionRow } from './types.ts';

/**
 * - `changed`: a Mentor or Officer has had their say; nothing more to do.
 * - `failed`: the AI could not read it; it needs a person.
 * - `flagged`: the AI read it, but it reads like an attempt to steer the AI.
 * - `reading`: the AI has not finished.
 * - `read`: the AI's Evaluation stands.
 */
export type ReviewState = 'changed' | 'failed' | 'flagged' | 'reading' | 'read';

type Reviewed = Pick<EvaluationRow, 'status' | 'override_score' | 'override_note' | 'flagged'>;

export function reviewState(evaluation: Reviewed | null): ReviewState {
  if (!evaluation) return 'reading';
  if (evaluation.override_score !== null || evaluation.override_note !== null) return 'changed';
  if (evaluation.status === 'failed') return 'failed';
  if (evaluation.flagged) return 'flagged';
  return evaluation.status === 'pending' ? 'reading' : 'read';
}

export function needsPerson(state: ReviewState): boolean {
  return state === 'failed' || state === 'flagged';
}

export interface LearnerWork<T> {
  memberId: string;
  latest: T;
  attempts: number;
}

/** Each Learner's newest Submission, with how many attempts they made. */
export function latestPerLearner<T extends Pick<SubmissionRow, 'member_id' | 'created_at'>>(
  submissions: readonly T[],
): LearnerWork<T>[] {
  const byMember = new Map<string, LearnerWork<T>>();
  for (const submission of submissions) {
    const seen = byMember.get(submission.member_id);
    if (!seen) {
      byMember.set(submission.member_id, { memberId: submission.member_id, latest: submission, attempts: 1 });
    } else {
      seen.attempts += 1;
      if (Date.parse(submission.created_at) > Date.parse(seen.latest.created_at)) seen.latest = submission;
    }
  }
  return [...byMember.values()];
}

export interface TaskStats {
  learners: number;
  late: number;
  /** Mean of the scores that stand (the Mentor's where there is one), or null with none. */
  average: number | null;
  reading: number;
  attention: number;
}

export function taskStats(
  work: readonly LearnerWork<Pick<SubmissionRow, 'created_at' | 'evaluation'>>[],
  deadline: string,
): TaskStats {
  const scores: number[] = [];
  let late = 0;
  let reading = 0;
  let attention = 0;
  for (const { latest } of work) {
    const state = reviewState(latest.evaluation);
    if (lateBy(latest.created_at, deadline) > 0) late += 1;
    if (state === 'reading') reading += 1;
    if (needsPerson(state)) attention += 1;
    const score = latest.evaluation?.override_score ?? latest.evaluation?.ai_score ?? null;
    if (score !== null && latest.evaluation?.status !== 'pending') scores.push(score);
  }
  return {
    learners: work.length,
    late,
    average: scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    reading,
    attention,
  };
}

/** A Task as its Mentor sees it: a draft until published, then its deadline's phase. */
export type MentorTaskPhase = 'draft' | TaskPhase;

export function mentorTaskPhase(task: { deadline: string; published_at: string | null }, now: number): MentorTaskPhase {
  if (!task.published_at || Date.parse(task.published_at) > now) return 'draft';
  return taskPhase(task.deadline, now);
}

// ---------------------------------------------------------------------------
// The list of work on a Task's page
// ---------------------------------------------------------------------------

/** One Learner's latest attempt, ready to be a row. */
export interface ReviewRow<T> {
  memberId: string;
  name: string;
  roll: string;
  latest: T;
  attempts: number;
  state: ReviewState;
  /** Milliseconds past the deadline; 0 when on time. */
  late: number;
  /** The score that stands, once the AI or a Mentor has given one. */
  score: number | null;
  aiScore: number | null;
}

export const REVIEW_GROUPS = ['all', 'attention', 'reading', 'changed', 'late'] as const;
export type ReviewGroup = (typeof REVIEW_GROUPS)[number];

export const REVIEW_SORTS = ['recent', 'name', 'score'] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export function reviewRows<T extends Pick<SubmissionRow, 'member_id' | 'created_at' | 'evaluation'>>(
  submissions: readonly T[],
  submitters: readonly { member_id: string; name: string; roll: string }[],
  deadline: string,
): ReviewRow<T>[] {
  return latestPerLearner(submissions).map(({ memberId, latest, attempts }) => {
    const person = submitters.find((submitter) => submitter.member_id === memberId);
    const evaluation = latest.evaluation;
    const settled = evaluation && evaluation.status !== 'pending';
    return {
      memberId,
      name: person?.name ?? '',
      roll: person?.roll ?? '',
      latest,
      attempts,
      state: reviewState(evaluation),
      late: lateBy(latest.created_at, deadline),
      score: evaluation?.override_score ?? (settled ? (evaluation.ai_score ?? null) : null),
      aiScore: evaluation?.ai_score ?? null,
    };
  });
}

export function inGroup(row: Pick<ReviewRow<unknown>, 'state' | 'late'>, group: ReviewGroup): boolean {
  if (group === 'attention') return needsPerson(row.state);
  if (group === 'reading') return row.state === 'reading';
  if (group === 'changed') return row.state === 'changed';
  if (group === 'late') return row.late > 0;
  return true;
}

/** Rows in a group, matching a search by name or roll, in the order asked for. */
export function arrangeRows<T extends Pick<SubmissionRow, 'created_at'>>(
  rows: readonly ReviewRow<T>[],
  view: { group: ReviewGroup; q: string; sort: ReviewSort },
): ReviewRow<T>[] {
  const q = view.q.trim().toLowerCase();
  const shown = rows.filter(
    (row) => inGroup(row, view.group) && (!q || row.name.toLowerCase().includes(q) || row.roll.toLowerCase().includes(q)),
  );
  const recent = (a: ReviewRow<T>, b: ReviewRow<T>) => Date.parse(b.latest.created_at) - Date.parse(a.latest.created_at);
  if (view.sort === 'name') return shown.sort((a, b) => a.name.localeCompare(b.name, 'en') || recent(a, b));
  // Work with no score yet comes first: it is the work that most needs a look.
  if (view.sort === 'score') return shown.sort((a, b) => (a.score ?? -1) - (b.score ?? -1) || recent(a, b));
  return shown.sort(recent);
}

// ---------------------------------------------------------------------------
// The overview
// ---------------------------------------------------------------------------


export interface OverviewSession {
  session: { id: string; title: string; held_on: string; date_tbc?: boolean };
  tasks: readonly { id: string; title: string; deadline: string; published_at: string | null }[];
  submissions: readonly (Pick<SubmissionRow, 'member_id' | 'created_at' | 'evaluation'> & { task_id: string })[];
}

export interface Overview {
  /** Sessions this person can still change. */
  editable: number;
  /** Published Tasks that still take work. */
  takingWork: number;
  submissions: number;
  reading: number;
  /** Tasks with work that needs a person, most first. */
  attention: { taskId: string; title: string; count: number }[];
  /** Deadlines in the next seven days, soonest first. */
  deadlines: { taskId: string; title: string; sessionTitle: string; deadline: string }[];
}

export function overview(items: readonly OverviewSession[], now: number, isOfficer: boolean): Overview {
  const result: Overview = { editable: 0, takingWork: 0, submissions: 0, reading: 0, attention: [], deadlines: [] };
  for (const { session, tasks, submissions } of items) {
    const until = sessionEditUntil(session.held_on, tasks.map((task) => task.deadline), session.date_tbc);
    if (isOfficer || now <= until) result.editable += 1;
    result.submissions += submissions.length;

    for (const task of tasks) {
      const phase = mentorTaskPhase(task, now);
      if (phase === 'open' || phase === 'late') result.takingWork += 1;
      const due = Date.parse(task.deadline);
      if (phase !== 'draft' && due > now && due <= now + 7 * DAY_MS) {
        result.deadlines.push({ taskId: task.id, title: task.title, sessionTitle: session.title, deadline: task.deadline });
      }
      const work = latestPerLearner(submissions.filter((submission) => submission.task_id === task.id));
      const states = work.map((entry) => reviewState(entry.latest.evaluation));
      result.reading += states.filter((state) => state === 'reading').length;
      const count = states.filter(needsPerson).length;
      if (count > 0) result.attention.push({ taskId: task.id, title: task.title, count });
    }
  }
  result.attention.sort((a, b) => b.count - a.count);
  result.deadlines.sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
  return result;
}

// ---------------------------------------------------------------------------
// The plan's order
// ---------------------------------------------------------------------------

/**
 * Where something sits in the plan. A Track or Session an Officer has given a
 * place comes in that order; one with no place yet (0) comes after them all.
 */
export function planOrder(a: { position: number }, b: { position: number }): number {
  const place = (position: number) => (position > 0 ? position : Number.POSITIVE_INFINITY);
  const [first, second] = [place(a.position), place(b.position)];
  return first === second ? 0 : first - second;
}

// ---------------------------------------------------------------------------
// A Track's status
// ---------------------------------------------------------------------------

export const TRACK_STATUSES = ['upcoming', 'running', 'finished'] as const;

/** `upcoming` before it starts, `running` while it is taught, `finished` after. */
export type TrackStatus = (typeof TRACK_STATUSES)[number];

/** The database keeps two switches (`archived` is the core's); together they are one status. */
export function trackStatus(track: { archived: boolean; upcoming: boolean }): TrackStatus {
  if (track.archived) return 'finished';
  return track.upcoming ? 'upcoming' : 'running';
}

export function trackSwitches(status: TrackStatus): { archived: boolean; upcoming: boolean } {
  return { archived: status === 'finished', upcoming: status === 'upcoming' };
}
