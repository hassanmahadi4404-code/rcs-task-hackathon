/**
 * Moving the queue for the AI, one Submission at a time.
 *
 * A Submission is saved before any of this runs, so nothing here can lose a
 * Learner's work: the worst outcome is feedback that arrives later, or an
 * Evaluation left `failed` for the Mentor.
 *
 * The line and its pace live in the database (`claim_next_evaluation`):
 * oldest first, one request per slot, however many visitors arrive at once.
 * Every visit moves it. Handing in, a waiting Learner's page looking again,
 * a Mentor's button and the daily sweep all call `drainQueue`, which reads
 * whoever is at the front, not whoever is asking; so a Learner who closed
 * the tab is carried along by everyone else.
 *
 * One run:
 *   1. the database hands over the Submission at the front, if a slot is free;
 *   2. load the work, take personal data out (`prepare.ts`);
 *   3. `evaluate()`, under a time limit;
 *   4. check the result (`result.ts`) and store it; or
 *   5. on any failure, let `retry.ts` decide when to try again.
 *
 * Server only: it uses the service role (`service.ts`).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { evaluate } from '@/lib/evaluate';
import { EvaluatorError, failureOf } from '@/lib/tasks/evaluator-error';
import { fileNameOf } from '@/lib/tasks/files';
import { evaluatorPaceMs } from '@/lib/tasks/pace';
import { prepareSubmission } from '@/lib/tasks/prepare';
import { checkResult } from '@/lib/tasks/result';
import { afterFailure } from '@/lib/tasks/retry';
import { serviceClient } from '@/lib/tasks/service';

/** Longer than any evaluator's own limit; the claim's lock outlasts it. */
const RUN_TIMEOUT_MS = 40_000;

interface Work {
  body: string | null;
  file_path: string | null;
  created_at: string;
  task: { title: string; instructions: string; grading_criteria: string };
  evaluation: { attempts: number };
}

function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new EvaluatorError('timeout', 'The evaluator took too long.')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const one = <T>(value: T | T[] | null): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

/** Run the evaluator for a Submission the database has just handed over. Never throws. */
async function runClaimed(db: SupabaseClient, submissionId: string): Promise<void> {
  let attempts = 1;
  let submittedAt = Date.now();
  try {
    const { data } = await db
      .from('submissions')
      .select('body, file_path, created_at, task:tasks(title, instructions, grading_criteria), evaluation:evaluations(attempts)')
      .eq('id', submissionId)
      .single();
    const row = data as unknown as (Omit<Work, 'task' | 'evaluation'> & { task: Work['task'] | Work['task'][]; evaluation: Work['evaluation'] | Work['evaluation'][] }) | null;
    const task = row ? one(row.task) : null;
    if (!row || !task) throw new EvaluatorError('unavailable', 'The Submission could not be loaded.');
    attempts = one(row.evaluation)?.attempts ?? 1;
    submittedAt = Date.parse(row.created_at);

    const terms = await db.rpc('submission_personal_terms', { p_submission: submissionId });
    let file: { name: string; bytes: Uint8Array } | null = null;
    if (row.file_path) {
      const download = await db.storage.from('submissions').download(row.file_path);
      if (download.error || !download.data) throw new EvaluatorError('unavailable', 'The file could not be loaded.');
      file = { name: fileNameOf(row.file_path), bytes: new Uint8Array(await download.data.arrayBuffer()) };
    }

    const prepared = prepareSubmission({
      text: row.body,
      file,
      personalTerms: Array.isArray(terms.data) ? (terms.data as string[]) : [],
    });
    if (!prepared.readable) throw new EvaluatorError('unreadable', 'Nothing in the Submission can be read by an AI.');

    const result = checkResult(
      await within(
        evaluate({
          task: { title: task.title, instructions: task.instructions, gradingCriteria: task.grading_criteria },
          submission: prepared.submission,
        }),
        RUN_TIMEOUT_MS,
      ),
    );

    await db
      .from('evaluations')
      .update({
        status: 'done',
        ai_score: result.score,
        ai_feedback: result.feedback,
        model: result.model,
        flagged: prepared.flagged || result.flagged,
        failure_reason: null,
        locked_until: null,
      })
      .eq('submission_id', submissionId)
      .eq('status', 'pending');
  } catch (error) {
    const failure = failureOf(error);
    const now = Date.now();
    const next = afterFailure({ attempts, submittedAt, now, ...failure });
    if (!(error instanceof EvaluatorError)) console.error('Task platform: an evaluation run failed.', error);

    await db
      .from('evaluations')
      .update(
        next.status === 'failed'
          ? { status: 'failed', attempts: next.attempts, failure_reason: failure.reason, locked_until: null }
          : {
              attempts: next.attempts,
              failure_reason: failure.reason,
              next_attempt_at: new Date(next.nextAttemptAt).toISOString(),
              locked_until: null,
            },
      )
      .eq('submission_id', submissionId)
      .eq('status', 'pending');

    if (next.status === 'pending' && next.pauseUntil) {
      await db.from('evaluator_state').update({ paused_until: new Date(next.pauseUntil).toISOString() }).eq('id', true);
    }
  }
}

/**
 * Read the Submission at the front of the line, if there is one and a slot is
 * free. False when nothing was read. `taskId` keeps to one Task's line.
 */
export async function runNextEvaluation(taskId: string | null = null): Promise<boolean> {
  const db = serviceClient();
  if (!db) return false;
  const claim = await db.rpc('claim_next_evaluation', { p_interval_ms: evaluatorPaceMs(), p_task: taskId });
  if (typeof claim.data !== 'string') return false;
  await runClaimed(db, claim.data);
  return true;
}

export interface DrainOptions {
  /** The most Submissions one call reads. */
  max?: number;
  /** Stop starting new runs after this long. */
  budgetMs?: number;
  taskId?: string | null;
}

/**
 * Move the line as far as it will go right now. With a paced evaluator that
 * is one Submission per call, because the next slot is seconds away; with the
 * mock it is up to `max`. Returns how many were read.
 */
export async function drainQueue({ max = 3, budgetMs = 20_000, taskId = null }: DrainOptions = {}): Promise<number> {
  const started = Date.now();
  let read = 0;
  while (read < max && Date.now() - started < budgetMs) {
    if (!(await runNextEvaluation(taskId))) break;
    read += 1;
  }
  return read;
}

/** How long until the line can move again; null when nothing is waiting. */
async function untilNextSlot(db: SupabaseClient): Promise<number | null> {
  const now = Date.now();
  const [waiting, state] = await Promise.all([
    db.from('evaluations').select('submission_id').eq('status', 'pending').lte('next_attempt_at', new Date(now).toISOString()).limit(1),
    db.from('evaluator_state').select('next_slot_at, paused_until').eq('id', true).maybeSingle(),
  ]);
  if (!waiting.data?.length || !state.data) return null;
  const slot = Date.parse(state.data.next_slot_at as string);
  const paused = state.data.paused_until ? Date.parse(state.data.paused_until as string) : 0;
  return Math.max(SLOT_SLACK_MS, Math.max(slot, paused) - now + SLOT_SLACK_MS);
}

/** A little past the slot, so the clocks of the server and the database need not agree to the millisecond. */
const SLOT_SLACK_MS = 250;

/**
 * For the sweep, which has time and nobody waiting on it: keep reading, and
 * between slots wait for the next one, until the line is empty or `budgetMs`
 * is spent. Returns how many were read.
 */
export async function sweepQueue(budgetMs: number): Promise<number> {
  const db = serviceClient();
  if (!db) return 0;
  const started = Date.now();
  let read = 0;
  while (Date.now() - started < budgetMs) {
    if (await runNextEvaluation()) {
      read += 1;
      continue;
    }
    const wait = await untilNextSlot(db);
    if (wait === null || Date.now() - started + wait >= budgetMs) break;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  return read;
}
