/**
 * The task platform's rows, as the pages read them. Column names are the
 * database's, so a row from Supabase is one of these without mapping.
 *
 * No `@/` imports: Node's test runner executes the modules that import this.
 */

import type { FailureReason } from './evaluator-error.ts';
import type { Format } from './rules.ts';

export type EvaluationStatus = 'pending' | 'done' | 'failed';

export interface EvaluationRow {
  submission_id: string;
  status: EvaluationStatus;
  ai_score: number | null;
  ai_feedback: string | null;
  model: string | null;
  override_score: number | null;
  override_note: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
  updated_at: string;
  attempts: number;
  next_attempt_at: string;
  failure_reason: FailureReason | null;
  flagged: boolean;
}

export interface SubmissionRow {
  id: string;
  task_id: string;
  member_id: string;
  body: string | null;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
  /** Always there (a trigger adds it), but typed as the join it is. */
  evaluation: EvaluationRow | null;
}

export interface TrackRow {
  id: string;
  name: string;
  description: string;
  archived: boolean;
}

export interface SessionRow {
  id: string;
  track_id: string;
  title: string;
  held_on: string;
}

export interface TaskRow {
  id: string;
  session_id: string;
  title: string;
  instructions: string;
  grading_criteria: string;
  deadline: string;
  formats: Format[];
  published_at: string | null;
}

/** A Learner who handed work in, as their Mentor may know them. */
export interface Submitter {
  member_id: string;
  name: string;
  roll: string;
}
