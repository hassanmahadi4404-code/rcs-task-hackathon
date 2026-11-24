/**
 * The evaluator seam — BRIEF.md, "What cannot change", rule 5.
 *
 * `EVALUATOR` picks the implementation: `mock` (the default) is deterministic
 * and needs no network or key, `gemini` asks Google Gemini with
 * `GEMINI_API_KEY`, and `fail` always throws.
 *
 * Callers do not pass a Learner's work straight in: `lib/tasks/prepare.ts`
 * takes personal data out first (rule 6), and `lib/tasks/run-evaluation.ts`
 * checks the result again and decides what a failure means.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import { evaluatorFromEnv, type EvaluationInput, type EvaluationResult } from './evaluation-contract.ts';
import { EvaluatorError } from './tasks/evaluator-error.ts';
import { geminiEvaluate } from './tasks/evaluator-gemini.ts';
import { mockEvaluate } from './tasks/evaluator-mock.ts';

export async function evaluate(input: EvaluationInput): Promise<EvaluationResult> {
  switch (evaluatorFromEnv()) {
    case 'fail':
      throw new EvaluatorError('unavailable', 'EVALUATOR=fail: this evaluator always fails.');
    case 'gemini':
      return geminiEvaluate(input);
    default:
      return mockEvaluate(input);
  }
}
