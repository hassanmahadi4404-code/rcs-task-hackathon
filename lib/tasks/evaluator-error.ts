/**
 * Why an evaluator did not return an Evaluation.
 *
 * `evaluate()` throws this (or anything else, which is read as `unavailable`);
 * `retry.ts` decides from the reason whether and when to try again.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

export const FAILURE_REASONS = ['quota', 'timeout', 'invalid_output', 'unreadable', 'unavailable'] as const;

/**
 * - `quota`: the model's free quota is used up for now.
 * - `timeout`: the model did not answer in time.
 * - `invalid_output`: it answered, but not with marks that can be trusted.
 * - `unreadable`: there is nothing in the Submission an AI can read.
 * - `unavailable`: anything else: the network, a server error, a missing key.
 */
export type FailureReason = (typeof FAILURE_REASONS)[number];

export class EvaluatorError extends Error {
  reason: FailureReason;
  /** How long the model asked to be left alone, when it said. */
  retryAfterMs: number | null;

  constructor(reason: FailureReason, message: string, retryAfterMs: number | null = null) {
    super(message);
    this.name = 'EvaluatorError';
    this.reason = reason;
    this.retryAfterMs = retryAfterMs;
  }
}

export function failureOf(error: unknown): { reason: FailureReason; retryAfterMs: number | null } {
  if (error instanceof EvaluatorError) return { reason: error.reason, retryAfterMs: error.retryAfterMs };
  return { reason: 'unavailable', retryAfterMs: null };
}
