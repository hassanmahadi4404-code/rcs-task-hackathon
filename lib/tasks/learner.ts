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

/** A Task is `running` while it still takes work, late work included, and `finished` after. */
export interface Grouped<T> {
  /** Still taking work: what the Learner has not done yet first, then soonest deadline. */
  running: T[];
  /** Closed, most recent deadline first. */
  finished: T[];
}

type Listed = { deadline: string; attempts: readonly AttemptSummary[] };

export function groupTasks<T extends Listed>(tasks: readonly T[], now: number): Grouped<T> {
  const groups: Grouped<T> = { running: [], finished: [] };
  for (const task of tasks) {
    (taskPhase(task.deadline, now) === 'closed' ? groups.finished : groups.running).push(task);
  }
  const due = (task: T) => Date.parse(task.deadline);
  const done = (task: T) => (task.attempts.length > 0 ? 1 : 0);
  groups.running.sort((a, b) => done(a) - done(b) || due(a) - due(b));
  groups.finished.sort((a, b) => due(b) - due(a));
  return groups;
}

export interface LearnerSummary {
  /** Tasks still taking work. */
  running: number;
  /** Of those, the ones the Learner has not handed anything in for. */
  todo: number;
  finished: number;
  /** The scores that stand on the Learner's latest attempts, added up. */
  points: number;
}

export function learnerSummary(tasks: readonly Listed[], now: number): LearnerSummary {
  const summary: LearnerSummary = { running: 0, todo: 0, finished: 0, points: 0 };
  for (const task of tasks) {
    const latest = latestAttempt(task.attempts);
    if (taskPhase(task.deadline, now) === 'closed') summary.finished += 1;
    else {
      summary.running += 1;
      if (!latest) summary.todo += 1;
    }
    // A Mentor's score counts at once; the AI's once it has finished reading.
    if (latest && (latest.overrideScore !== null || latest.status === 'done')) {
      summary.points += effectiveScore(latest) ?? 0;
    }
  }
  return summary;
}

/**
 * Which of a Task's three steps a Learner is on: 1 read it, 2 submit work,
 * 3 get feedback; 4 when all three are behind them. Opening the Task is
 * reading it, so nobody is shown step 1 as still to do.
 */
export function currentStep(attempts: readonly AttemptSummary[]): 2 | 3 | 4 {
  const latest = latestAttempt(attempts);
  if (!latest) return 2;
  return latest.status === 'pending' && !latest.overridden ? 3 : 4;
}
