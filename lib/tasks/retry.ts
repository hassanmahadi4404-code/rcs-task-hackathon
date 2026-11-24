/**
 * What happens to an Evaluation after a run of the evaluator fails.
 *
 * The Submission is already saved, so a failure only ever delays feedback.
 * A run is tried again a few times, further apart each time, and then the
 * Evaluation is `failed` and waits for the Mentor. A used-up quota is not the
 * Submission's fault: it does not count as a run, and it holds every other
 * waiting Evaluation back as well, until the quota returns or two days pass.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import type { FailureReason } from './evaluator-error.ts';
import { DAY_MS } from './rules.ts';

/** Runs of the evaluator one Submission gets before it is left to the Mentor. */
export const MAX_RUNS = 5;

/** The wait after the first, second, third and fourth failed run. */
const WAITS_MS = [10_000, 30_000, 2 * 60_000, 10 * 60_000];

/** How long a Submission may wait on quota before it is left to the Mentor. */
export const QUOTA_PATIENCE_MS = 2 * DAY_MS;

const MIN_QUOTA_WAIT_MS = 30_000;
const DEFAULT_QUOTA_WAIT_MS = 5 * 60_000;
const MAX_QUOTA_WAIT_MS = 60 * 60_000;

export interface FailedRun {
  /** Runs so far, this one included. */
  attempts: number;
  reason: FailureReason;
  retryAfterMs: number | null;
  /** When the Submission was handed in. */
  submittedAt: number;
  now: number;
}

export type AfterFailure =
  | { status: 'failed'; attempts: number }
  | {
      status: 'pending';
      attempts: number;
      nextAttemptAt: number;
      /** Set when no Evaluation at all should be tried before this. */
      pauseUntil: number | null;
    };

export function afterFailure({ attempts, reason, retryAfterMs, submittedAt, now }: FailedRun): AfterFailure {
  // Trying again cannot make a file readable.
  if (reason === 'unreadable') return { status: 'failed', attempts };

  if (reason === 'quota') {
    const runs = Math.max(0, attempts - 1);
    if (now - submittedAt > QUOTA_PATIENCE_MS) return { status: 'failed', attempts: runs };
    const wait = Math.min(MAX_QUOTA_WAIT_MS, Math.max(MIN_QUOTA_WAIT_MS, retryAfterMs ?? DEFAULT_QUOTA_WAIT_MS));
    return { status: 'pending', attempts: runs, nextAttemptAt: now + wait, pauseUntil: now + wait };
  }

  if (attempts >= MAX_RUNS) return { status: 'failed', attempts };
  const wait = WAITS_MS[Math.min(attempts, WAITS_MS.length) - 1] ?? WAITS_MS[0];
  return { status: 'pending', attempts, nextAttemptAt: now + wait, pauseUntil: null };
}
