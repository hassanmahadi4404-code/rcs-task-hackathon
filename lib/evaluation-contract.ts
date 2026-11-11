/**
 * The evaluator seam's contract. Starter kit file: do not edit.
 *
 * Write `lib/evaluate.ts` exporting
 *
 *   evaluate(input: EvaluationInput): Promise<EvaluationResult>
 *
 * and pick the implementation with `evaluatorFromEnv()`. BRIEF.md, "What
 * cannot change", rules 5 and 6, says what each implementation must do.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

export interface EvaluationInput {
  task: {
    title: string;
    instructions: string;
    gradingCriteria: string;
  };
  submission: {
    /** The text answer, if the Learner wrote one. */
    text: string | null;
    /** The uploaded file, if any: at most one, at most 10 MB. */
    file: { name: string; mediaType: string; bytes: Uint8Array } | null;
  };
}

export interface EvaluationResult {
  /** A whole number from 0 to 100. */
  score: number;
  /** Written for the Learner. */
  feedback: string;
  /** Which implementation produced it, e.g. `mock` or a Gemini model name. */
  model: string;
}

export const EVALUATORS = ['mock', 'gemini', 'fail'] as const;
export type Evaluator = (typeof EVALUATORS)[number];

/** `EVALUATOR` from the environment; unset or unknown means `mock`. */
export function evaluatorFromEnv(value: string | undefined = process.env.EVALUATOR): Evaluator {
  const wanted = value?.trim().toLowerCase();
  return (EVALUATORS as readonly string[]).includes(wanted ?? '') ? (wanted as Evaluator) : 'mock';
}

/** True for a score the Brief allows: a whole number from 0 to 100. */
export function isScore(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 100;
}
