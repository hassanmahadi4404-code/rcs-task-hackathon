/**
 * What to say about an Evaluation that has not finished: the honest reason,
 * and when to look again.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import type { EvaluationRow } from './types.ts';

/**
 * - `first`: the first run is under way.
 * - `retry`: a run failed and another is scheduled.
 * - `quota`: the AI is out of quota; every Evaluation is waiting.
 * - `stalled`: a run started and nothing has been heard since.
 */
export type PendingWhy = 'first' | 'retry' | 'quota' | 'stalled';

/** A run that has not reported back in this long is not going to. */
const STALLED_AFTER_MS = 3 * 60_000;

export function pendingWhy(
  evaluation: Pick<EvaluationRow, 'attempts' | 'failure_reason' | 'updated_at'>,
  now: number,
): PendingWhy {
  if (evaluation.failure_reason === 'quota') return 'quota';
  if (evaluation.failure_reason) return 'retry';
  return now - Date.parse(evaluation.updated_at) > STALLED_AFTER_MS ? 'stalled' : 'first';
}

const MIN_POLL_MS = 2500;
const MAX_POLL_MS = 60_000;

/** How long a page waits before it asks again: just past the next run, within reason. */
export function pollDelay(nextAttemptAt: string, now: number): number {
  return Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, Date.parse(nextAttemptAt) - now + 1000));
}
