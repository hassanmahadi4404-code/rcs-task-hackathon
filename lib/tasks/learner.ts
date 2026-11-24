/**
 * What a Learner is shown about a Task: where it stands for them, and which
 * list on `/learn` it belongs in.
 *
 * A Learner may make several attempts; the latest is the one that counts,
 * for them and for their Mentor.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import { taskPhase } from './deadlines.ts';
import type { EvaluationRow, EvaluationStatus } from './types.ts';

/** One attempt, as much as the lists need. */
export interface AttemptSummary {
  createdAt: string;
  status: EvaluationStatus;
  aiScore: number | null;
  overrideScore: number | null;
  /** A Mentor set a score, wrote a note, or both. */
  overridden: boolean;
}

export type LearnerState = 'todo' | 'todo_late' | 'reading' | 'feedback' | 'mentor' | 'needs_mentor' | 'missed';

/** The Mentor's score when there is one, otherwise the AI's. */
export function effectiveScore(scores: { aiScore: number | null; overrideScore: number | null }): number | null {
  return scores.overrideScore ?? scores.aiScore;
}

export function summarise(createdAt: string, evaluation: Pick<EvaluationRow, 'status' | 'ai_score' | 'override_score' | 'override_note'> | null): AttemptSummary {
  return {
    createdAt,
    status: evaluation?.status ?? 'pending',
    aiScore: evaluation?.ai_score ?? null,
    overrideScore: evaluation?.override_score ?? null,
    overridden: evaluation ? evaluation.override_score !== null || evaluation.override_note !== null : false,
  };
}

/** The newest of a Learner's attempts, or undefined when there are none. */
export function latestAttempt<T extends { createdAt: string }>(attempts: readonly T[]): T | undefined {
  return [...attempts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

export function learnerState(deadline: string, attempts: readonly AttemptSummary[], now: number): LearnerState {
  const latest = latestAttempt(attempts);
  if (!latest) {
    const phase = taskPhase(deadline, now);
    return phase === 'open' ? 'todo' : phase === 'late' ? 'todo_late' : 'missed';
  }
  if (latest.overridden) return 'mentor';
  if (latest.status === 'done') return 'feedback';
  return latest.status === 'failed' ? 'needs_mentor' : 'reading';
}

export interface Grouped<T> {
  /** Still to do, soonest deadline first. */
  waiting: T[];
  /** Handed in, most recent first. */
  handedIn: T[];
  /** Closed without the Learner's work, most recent deadline first. */
  missed: T[];
}

export function groupTasks<T extends { deadline: string; attempts: readonly AttemptSummary[] }>(
  tasks: readonly T[],
  now: number,
): Grouped<T> {
  const groups: Grouped<T> = { waiting: [], handedIn: [], missed: [] };
  for (const task of tasks) {
    const state = learnerState(task.deadline, task.attempts, now);
    if (state === 'todo' || state === 'todo_late') groups.waiting.push(task);
    else if (state === 'missed') groups.missed.push(task);
    else groups.handedIn.push(task);
  }
  const due = (task: T) => Date.parse(task.deadline);
  const handed = (task: T) => Date.parse(latestAttempt(task.attempts)?.createdAt ?? task.deadline);
  groups.waiting.sort((a, b) => due(a) - due(b));
  groups.handedIn.sort((a, b) => handed(b) - handed(a));
  groups.missed.sort((a, b) => due(b) - due(a));
  return groups;
}
