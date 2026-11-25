/**
 * The queue for the AI, as numbers a page can show.
 *
 * The database keeps the line and its pace (`claim_next_evaluation`,
 * `evaluation_queue`). This says how fast the line may move for the
 * evaluator in use, and turns "how many are ahead" into "about how long".
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import type { Evaluator } from '../evaluation-contract.ts';

/**
 * Requests a minute sent to Gemini unless `GEMINI_PER_MINUTE` says otherwise:
 * under the free tier's limit, so the line moves steadily instead of in
 * bursts that get refused.
 */
export const DEFAULT_GEMINI_PER_MINUTE = 10;

const MAX_PER_MINUTE = 600;

/**
 * The least time between two requests to the evaluator. The mock needs no
 * network and `fail` makes no request, so neither is paced.
 */
export function evaluatorIntervalMs(evaluator: Evaluator, perMinute: string | undefined): number {
  if (evaluator !== 'gemini') return 0;
  const asked = Number(perMinute);
  const rate = Number.isInteger(asked) && asked >= 1 && asked <= MAX_PER_MINUTE ? asked : DEFAULT_GEMINI_PER_MINUTE;
  return Math.ceil(60_000 / rate);
}

/** What `evaluation_queue()` answers for one Submission. */
export interface QueueState {
  /** Waiting Evaluations submitted before this one. */
  ahead: number;
  next_slot_at: string;
  paused_until: string | null;
}

export interface QueueEstimate {
  /** 1 is the front of the line. */
  position: number;
  /** About how long until this Submission is read. */
  waitMs: number;
  /** The model is out of quota for now; nothing moves until it is back. */
  paused: boolean;
}

/**
 * The line moves one place per interval, starting when the next slot comes,
 * the pause ends, and this Evaluation is due, whichever is last.
 */
export function queueEstimate(queue: QueueState, nextAttemptAt: string, intervalMs: number, now: number): QueueEstimate {
  const pausedUntil = queue.paused_until ? Date.parse(queue.paused_until) : 0;
  const starts = Math.max(now, Date.parse(queue.next_slot_at), pausedUntil, Date.parse(nextAttemptAt));
  return {
    position: queue.ahead + 1,
    waitMs: starts - now + queue.ahead * intervalMs,
    paused: pausedUntil > now,
  };
}

const MIN_POLL_MS = 2500;
const MAX_POLL_MS = 20_000;

/**
 * How long a page waits before it looks again: about half the wait, so it is
 * there when its turn comes, and never so rarely that the line stalls. Every
 * look also moves the line for whoever is at the front.
 */
export function queuePollDelay(waitMs: number): number {
  return Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, Math.round(waitMs / 2)));
}

/** A wait, in the unit people would say it in. `moments` is anything under a quarter of a minute. */
export type Wait = { unit: 'moments' } | { unit: 'seconds' | 'minutes' | 'hours'; n: number };

export function waitParts(ms: number): Wait {
  if (ms < 15_000) return { unit: 'moments' };
  if (ms < 90_000) return { unit: 'seconds', n: Math.round(ms / 10_000) * 10 };
  if (ms < 90 * 60_000) return { unit: 'minutes', n: Math.round(ms / 60_000) };
  return { unit: 'hours', n: Math.round(ms / 3_600_000) };
}
