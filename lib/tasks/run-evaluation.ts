/**
 * Running the evaluator for one Submission, and living with what happens.
 *
 * The Submission is already saved before this is ever called, so nothing here
 * can lose a Learner's work: the worst outcome is feedback that arrives
 * later, or an Evaluation left `failed` for the Mentor. One run:
 *
 *   1. claim the Evaluation, so two requests never read the same work;
 *   2. load the work, take personal data out (`prepare.ts`);
 *   3. `evaluate()`, under a time limit;
 *   4. check the result (`result.ts`) and store it; or
 *   5. on any failure, let `retry.ts` decide when to try again.
 *
 * Server only: it uses the service role (`service.ts`).
 */

import { evaluate } from '@/lib/evaluate';
import { EvaluatorError, failureOf } from '@/lib/tasks/evaluator-error';
import { fileNameOf } from '@/lib/tasks/files';
import { prepareSubmission } from '@/lib/tasks/prepare';
import { checkResult } from '@/lib/tasks/result';
import { afterFailure } from '@/lib/tasks/retry';
import { serviceClient } from '@/lib/tasks/service';

/** Longer than any evaluator's own limit; the claim's lock outlasts it. */
const RUN_TIMEOUT_MS = 40_000;

/** How many waiting Evaluations one request works through. */
const BATCH = 10;

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

/** Run the evaluator for a Submission if its Evaluation is waiting and due. Never throws. */
export async function runEvaluation(submissionId: string): Promise<void> {
  const db = serviceClient();
  if (!db) return;

  const claim = await db.rpc('claim_evaluation', { p_submission: submissionId });
  if (claim.data !== true) return;

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
 * Work through Evaluations that are waiting and due, oldest first, one at a
 * time so a free quota is not spent in a burst. `taskId` keeps to one Task.
 */
export async function runDueEvaluations(taskId: string | null = null): Promise<number> {
  const db = serviceClient();
  if (!db) return 0;
  const due = await db.rpc('due_evaluations', { p_limit: BATCH, p_task: taskId });
  const ids = Array.isArray(due.data) ? (due.data as string[]) : [];
  for (const id of ids) await runEvaluation(id);
  return ids.length;
}
