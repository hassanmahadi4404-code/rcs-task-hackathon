/**
 * An evaluator's result, checked before it is stored — CONTRIBUTING.md:
 * "never trust what the AI sends back". Whatever `evaluate()` returned, only
 * a whole score from 0 to 100 with feedback a Learner can read gets through.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import { isScore } from '../evaluation-contract.ts';
import { EvaluatorError } from './evaluator-error.ts';

const MAX_FEEDBACK = 8000;
const MAX_MODEL = 80;

export interface CheckedResult {
  score: number;
  feedback: string;
  model: string;
  /** The evaluator itself thought the work was steering it. */
  flagged: boolean;
}

export function checkResult(result: unknown): CheckedResult {
  const candidate = (result ?? {}) as { score?: unknown; feedback?: unknown; model?: unknown; flagged?: unknown };
  const feedback = typeof candidate.feedback === 'string' ? candidate.feedback.trim() : '';
  if (!isScore(candidate.score) || !feedback) {
    throw new EvaluatorError('invalid_output', 'The evaluator returned a result that cannot be stored.');
  }
  return {
    score: candidate.score,
    feedback: feedback.slice(0, MAX_FEEDBACK),
    model: typeof candidate.model === 'string' && candidate.model.trim() ? candidate.model.trim().slice(0, MAX_MODEL) : 'unknown',
    flagged: candidate.flagged === true,
  };
}
